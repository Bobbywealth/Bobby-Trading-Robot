/**
 * Signal Generation Engine
 * Monitors market data and generates trade signals based on user strategies
 */

import vm from "node:vm";
import { storage, MOCK_USER_ID } from "./storage";
import { getForexGameService, type QuoteData, type CandleData } from "./forex-game";
import { createIndicators, type Candle } from "./indicators";
import type { BrokerCredential, RiskConfig, Strategy, TradeSignal } from "@shared/schema";
import type { WebSocketServer as WSServer } from "./websocket";

export interface QuoteData {
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
}

export interface EngineOptions {
  mode: 'realtime' | 'periodic';
  intervalMs?: number;
  symbols: string[];
  dryRun?: boolean;
  signalExpirationMinutes?: number;
}

export interface EngineStatus {
  running: boolean;
  mode: 'realtime' | 'periodic';
  symbols: string[];
  activeStrategyIds: string[];
  lastTick: number | null;
  lastSignal: number | null;
  totalSignalsGenerated: number;
  dryRun: boolean;
}

interface StrategyContext {
  quotes: Record<string, QuoteData>;
  candles: Record<string, Candle[]>;
  indicators: ReturnType<typeof createIndicators>;
  account: any; // Forex.game account info
  riskConfig: RiskConfig | undefined;
  log: {
    info: (msg: string) => void;
    error: (msg: string) => void;
  };
  generateSignal: (signal: Omit<TradeSignal, 'id' | 'userId' | 'timestamp' | 'status'>) => void;
}

type OnTick = (ctx: StrategyContext) => Promise<void> | void;

class SignalEngine {
  private timer: NodeJS.Timeout | null = null;
  private activeStrategies: Strategy[] = [];
  private activeSymbols: string[] = [];
  private options: EngineOptions = {
    mode: 'realtime',
    symbols: [],
    dryRun: true,
    signalExpirationMinutes: 60,
  };
  private credential: any = null; // Forex.game account info
  private riskConfig: RiskConfig | undefined;
  private forexGame: any = null;
  private lastTick: number | null = null;
  private lastSignal: number | null = null;
  private totalSignalsGenerated = 0;
  private candlesCache: Record<string, Candle[]> = {};
  private wsServer: WSServer | null = null;

  constructor() {
    // Initialize empty candles cache
  }

  setWebSocketServer(wsServer: WSServer): void {
    this.wsServer = wsServer;
  }

  status(): EngineStatus {
    return {
      running: this.timer !== null,
      mode: this.options.mode,
      symbols: this.activeSymbols,
      activeStrategyIds: this.activeStrategies.map(s => s.id),
      lastTick: this.lastTick,
      lastSignal: this.lastSignal,
      totalSignalsGenerated: this.totalSignalsGenerated,
      dryRun: this.options.dryRun ?? true,
    };
  }

  async start(strategies: Strategy[], options: EngineOptions): Promise<void> {
    await this.stop();

    this.activeStrategies = strategies;
    this.options = {
      ...this.options,
      ...options,
      signalExpirationMinutes: options.signalExpirationMinutes ?? 60,
    };
    this.activeSymbols = options.symbols;

    // Get Forex.game service
    this.forexGame = getForexGameService();

    // Get risk config
    this.riskConfig = await storage.getRiskConfig(MOCK_USER_ID);

    // Load historical candles for each symbol
    await this.loadHistoricalCandles();

    // Start the engine
    const intervalMs = this.options.intervalMs ?? 1000;
    
    this.timer = setInterval(async () => {
      try {
        await this.tick();
        this.lastTick = Date.now();
      } catch (err: any) {
        console.error("[signal-engine] tick error:", err);
      }
    }, intervalMs);

    console.log(`[signal-engine] Started in ${this.options.mode} mode, monitoring: ${this.activeSymbols.join(', ')}`);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.activeStrategies = [];
    this.activeSymbols = [];
    this.credential = null;
    this.tradeLocker = null;
    this.lastTick = null;
    console.log("[signal-engine] Stopped");
  }

  private async loadHistoricalCandles(): Promise<void> {
    for (const symbol of this.activeSymbols) {
      try {
        const candles = await this.forexGame.getCandles(symbol, 'H1', 200);
        this.candlesCache[symbol] = candles.map((c: CandleData) => ({
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          timestamp: c.time,
        }));
        console.log(`[signal-engine] Loaded ${candles.length} candles for ${symbol}`);
      } catch (err) {
        console.error(`[signal-engine] Failed to load candles for ${symbol}:`, err);
        this.candlesCache[symbol] = [];
      }
    }
  }

  private async tick(): Promise<void> {
    // Fetch current quotes for all symbols
    const quotes = await this.forexGame.getQuotes(this.activeSymbols);
    
    // Update candles cache with latest data
    for (const symbol of this.activeSymbols) {
      const quote = quotes.find((q: any) => q.s === symbol);
      if (quote && this.candlesCache[symbol]?.length > 0) {
        const lastCandle = this.candlesCache[symbol][this.candlesCache[symbol].length - 1];
        const lastTimestamp = lastCandle.timestamp;
        const currentTimestamp = quote.timestamp;
        
        // If it's a new candle, add it
        if (currentTimestamp > lastTimestamp + (60 * 60 * 1000)) { // 1 hour
          this.candlesCache[symbol].push({
            open: quote.mid,
            high: quote.mid,
            low: quote.mid,
            close: quote.mid,
            timestamp: currentTimestamp,
          });
          
          // Keep only last 200 candles
          if (this.candlesCache[symbol].length > 200) {
            this.candlesCache[symbol] = this.candlesCache[symbol].slice(-200);
          }
        } else {
          // Update current candle
          lastCandle.high = Math.max(lastCandle.high, quote.mid);
          lastCandle.low = Math.min(lastCandle.low, quote.mid);
          lastCandle.close = quote.mid;
        }
      }
    }

    // Create quote data object
    const quotesData: Record<string, QuoteData> = {};
    for (const q of quotes) {
      quotesData[q.s] = {
        bid: q.bid,
        ask: q.ask,
        mid: (q.bid + q.ask) / 2,
        timestamp: q.timestamp,
      };
    }

    // Run each strategy
    for (const strategy of this.activeStrategies) {
      try {
        const onTick = this.loadStrategy(strategy.code);
        const ctx = this.createContext(strategy, quotesData);
        await onTick(ctx);
      } catch (err: any) {
        console.error(`[signal-engine] Strategy ${strategy.id} error:`, err);
      }
    }
  }

  private loadStrategy(code: string): OnTick {
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

  private createContext(strategy: Strategy, quotes: Record<string, QuoteData>): StrategyContext {
    const indicators = createIndicators(this.candlesCache[this.activeSymbols[0]] || []);

    return {
      quotes,
      candles: this.candlesCache,
      indicators,
      account: this.credential!,
      riskConfig: this.riskConfig,
      log: {
        info: (msg: string) => console.log(`[strategy:${strategy.name}] ${msg}`),
        error: (msg: string) => console.error(`[strategy:${strategy.name}] ${msg}`),
      },
      generateSignal: async (signalData) => {
        await this.generateSignal(strategy, signalData);
      },
    };
  }

  private async generateSignal(strategy: Strategy, signalData: Omit<TradeSignal, 'id' | 'userId' | 'timestamp' | 'status'>): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.options.signalExpirationMinutes! * 60 * 1000));

    const signal: TradeSignal = {
      ...signalData,
      id: crypto.randomUUID(),
      userId: MOCK_USER_ID,
      strategyId: strategy.id,
      strategyName: strategy.name,
      timestamp: now,
      status: 'pending',
      expiresAt,
    };

    // Validate signal
    if (!this.validateSignal(signal)) {
      console.log(`[signal-engine] Signal validation failed for ${signal.symbol}`);
      return;
    }

    // Store signal in database
    const storedSignal = await storage.createSignal(signal);
    this.lastSignal = Date.now();
    this.totalSignalsGenerated++;

    console.log(`[signal-engine] Generated signal: ${signal.direction} ${signal.symbol} @ ${signal.entryPrice} (confidence: ${signal.confidence}%)`);

    // Broadcast via WebSocket
    if (this.wsServer) {
      this.wsServer.broadcastSignal(storedSignal);
    }
  }

  private validateSignal(signal: TradeSignal): boolean {
    // Check if signal direction is valid
    if (signal.direction !== 'buy' && signal.direction !== 'sell') {
      return false;
    }

    // Check confidence is within range
    if (signal.confidence < 0 || signal.confidence > 100) {
      return false;
    }

    // Check entry price is positive
    if (signal.entryPrice <= 0) {
      return false;
    }

    // Check stop loss and take profit are valid if provided
    if (signal.stopLoss !== undefined && signal.stopLoss <= 0) {
      return false;
    }
    if (signal.takeProfit !== undefined && signal.takeProfit <= 0) {
      return false;
    }

    // Check reasoning is provided
    if (!signal.reasoning || signal.reasoning.trim().length === 0) {
      return false;
    }

    // Check symbol is in monitored list
    if (!this.activeSymbols.includes(signal.symbol)) {
      return false;
    }

    return true;
  }
}

export const signalEngine = new SignalEngine();
