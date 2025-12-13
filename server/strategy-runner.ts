import vm from "node:vm";
import { storage, MOCK_USER_ID } from "./storage";
import { initializeTradeLockerService } from "./tradelocker";
import type { BrokerCredential, RiskConfig, Strategy } from "@shared/schema";

type OnTick = (ctx: StrategyContext) => Promise<void> | void;

type StrategyContext = {
  quotes: Record<string, { bid: number; ask: number; mid: number; timestamp: number }>;
  account: BrokerCredential;
  riskConfig: RiskConfig | undefined;
  log: {
    info: (msg: string) => void;
    error: (msg: string) => void;
  };
  placeOrder: (order: {
    instrumentId: number;
    qty: number;
    side: "buy" | "sell";
    type: "market" | "limit" | "stop";
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => Promise<void>;
};

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isWithinTradingWindow(start?: string | null, end?: string | null, now: Date = new Date()): boolean {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === null || endMin === null) return true;

  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (startMin <= endMin) {
    return currentMin >= startMin && currentMin <= endMin;
  }
  return currentMin >= startMin || currentMin <= endMin;
}

function loadStrategy(code: string): OnTick {
  // Expect CommonJS export: module.exports.onTick = (ctx) => {}
  const sandbox: any = { module: { exports: {} }, exports: {}, console };
  vm.createContext(sandbox);
  try {
    vm.runInContext(code, sandbox, { timeout: 200, displayErrors: true });
  } catch (err: any) {
    throw new Error(`Failed to compile strategy: ${err?.message || err}`);
  }
  const onTick: OnTick = sandbox.module.exports.onTick || sandbox.exports.onTick;
  if (typeof onTick !== "function") {
    throw new Error("Strategy must export onTick(ctx)");
  }
  return onTick;
}

class StrategyRunner {
  private timer: NodeJS.Timeout | null = null;
  private activeStrategyId: string | null = null;
  private lastTick: number | null = null;
  private lastError: string | null = null;
  private isDryRun = true; // start safe
  private intervalMs = 1000;

  status() {
    return {
      running: Boolean(this.timer),
      strategyId: this.activeStrategyId,
      lastTick: this.lastTick,
      lastError: this.lastError,
      dryRun: this.isDryRun,
    };
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.activeStrategyId = null;
  }

  async start(strategyId: string, { dryRun = true, intervalMs = 1000 }: { dryRun?: boolean; intervalMs?: number } = {}) {
    await this.stop();
    this.isDryRun = dryRun;
    this.intervalMs = intervalMs;

    const strategy = await storage.getStrategy(strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    const credential = await storage.getBrokerCredential(MOCK_USER_ID);
    if (!credential || !credential.accessToken || !credential.accountNumber) {
      throw new Error("Broker not connected or account not selected");
    }

    const riskConfig = await storage.getRiskConfig(MOCK_USER_ID);
    const tradeLocker = initializeTradeLockerService(
      MOCK_USER_ID,
      credential.server,
      credential.accessToken,
      credential.refreshToken!,
      credential.accountNumber
    );

    const onTick = loadStrategy(strategy.code);
    this.activeStrategyId = strategyId;
    this.lastError = null;

    this.timer = setInterval(async () => {
      try {
        await this.tick(onTick, credential, riskConfig, tradeLocker);
        this.lastTick = Date.now();
      } catch (err: any) {
        this.lastError = err?.message || String(err);
        console.error("[strategy-runner] tick error:", err);
      }
    }, this.intervalMs);
  }

  private async tick(onTick: OnTick, credential: BrokerCredential, riskConfig: RiskConfig | undefined, tradeLocker: any) {
    // Fetch quotes for now only XAUUSD
    const quotes = await tradeLocker.getQuotes(["XAUUSD"]);
    const q = quotes?.[0];
    if (!q) return;

    const ctx: StrategyContext = {
      quotes: {
        XAUUSD: {
          bid: q.bid,
          ask: q.ask,
          mid: (q.bid + q.ask) / 2,
          timestamp: q.timestamp,
        },
      },
      account: credential,
      riskConfig,
      log: {
        info: (msg: string) => console.log("[strategy]", msg),
        error: (msg: string) => console.error("[strategy]", msg),
      },
      placeOrder: async (order) => {
        if (!this.passesRisk(order, riskConfig)) {
          throw new Error("Risk check failed");
        }
        if (this.isDryRun) {
          console.log("[strategy] dry-run order", order);
          return;
        }
        await tradeLocker.placeOrder(order);
      },
    };

    const maybePromise = onTick(ctx);
    if (maybePromise && typeof (maybePromise as any).then === "function") {
      await maybePromise;
    }
  }

  private passesRisk(
    order: { qty: number },
    riskConfig?: RiskConfig,
    now: Date = new Date()
  ): boolean {
    if (!riskConfig) return true;
    if (!isWithinTradingWindow(riskConfig.tradingHoursStart, riskConfig.tradingHoursEnd, now)) {
      return false;
    }
    const maxLotSize = riskConfig.maxLotSize ? Number(riskConfig.maxLotSize) : undefined;
    if (maxLotSize && order.qty > maxLotSize) return false;
    if (riskConfig.maxPositionSize && order.qty > riskConfig.maxPositionSize) return false;
    return true;
  }
}

export const strategyRunner = new StrategyRunner();

