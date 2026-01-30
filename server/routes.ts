import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, MOCK_USER_ID } from "./storage";
import { createTradeLockerService, getTradeLockerService, clearTradeLockerService, initializeTradeLockerService } from "./tradelocker";
import { strategyRunner } from "./strategy-runner";
import { signalEngine } from "./signal-engine";
import { wsServer } from "./websocket";
import { getForexGameService } from "./forex-game";
import {
  insertStrategySchema,
  insertRiskConfigSchema,
  insertTradeSchema,
  insertSystemLogSchema,
  insertBacktestResultSchema,
  insertBrokerCredentialSchema,
  insertTradeSignalSchema,
} from "@shared/schema";
import { z } from "zod";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Ensure the mock user exists to satisfy FK constraints when storing credentials.
  await storage.ensureUser(MOCK_USER_ID);

  app.post("/api/strategies", async (req, res) => {
    try {
      const validatedData = insertStrategySchema.parse({
        ...req.body,
        userId: MOCK_USER_ID,
      });
      const strategy = await storage.createStrategy(validatedData);
      res.json(strategy);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/strategies", async (req, res) => {
    try {
      const strategies = await storage.getStrategies(MOCK_USER_ID);
      res.json(strategies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/strategies/:id", async (req, res) => {
    try {
      const strategy = await storage.getStrategy(req.params.id);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/strategies/:id", async (req, res) => {
    try {
      const validatedData = insertStrategySchema.partial().parse(req.body);
      const strategy = await storage.updateStrategy(req.params.id, validatedData);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/strategies/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStrategy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/risk-config", async (req, res) => {
    try {
      const config = await storage.getRiskConfig(MOCK_USER_ID);
      res.json(config || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/risk-config", async (req, res) => {
    try {
      const validatedData = insertRiskConfigSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID,
      });
      const config = await storage.upsertRiskConfig(validatedData);
      res.json(config);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/trades", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const trades = await storage.getTrades(MOCK_USER_ID, limit);
      res.json(trades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const validatedData = insertTradeSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID,
      });
      const trade = await storage.createTrade(validatedData);
      res.json(trade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/trades/:id", async (req, res) => {
    try {
      const validatedData = insertTradeSchema.partial().parse(req.body);
      const trade = await storage.updateTrade(req.params.id, validatedData);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      res.json(trade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getSystemLogs(MOCK_USER_ID, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      const validatedData = insertSystemLogSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID,
      });
      const log = await storage.createSystemLog(validatedData);
      res.json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/backtest", async (req, res) => {
    try {
      const strategyId = req.query.strategyId as string | undefined;
      const results = await storage.getBacktestResults(MOCK_USER_ID, strategyId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/backtest", async (req, res) => {
    try {
      const validatedData = insertBacktestResultSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID,
      });
      const result = await storage.createBacktestResult(validatedData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const connectBrokerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    server: z.string().min(1),
  });

  app.post("/api/broker/connect", async (req, res) => {
    try {
      const { email, password, server } = connectBrokerSchema.parse(req.body);
      
      clearTradeLockerService(MOCK_USER_ID);
      
      const tradeLocker = createTradeLockerService(server);
      const authResult = await tradeLocker.authenticate(email, password, server);
      
      const accounts = await tradeLocker.getAccounts();
      
      await storage.upsertBrokerCredential({
        userId: MOCK_USER_ID,
        broker: "tradelocker",
        email,
        server,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        accountId: null,
        accountNumber: null,
        isConnected: true,
        lastConnected: new Date(),
      });

      res.json({
        success: true,
        accounts: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          accNum: a.accNum,
          currency: a.currency,
          balance: Number(a.accountBalance ?? (a as any).balance ?? 0),
          equity: Number(a.accountEquity ?? (a as any).equity ?? 0),
        })),
      });
    } catch (error: any) {
      res.status(400).json({
        error: "Failed to connect broker",
        details: error?.message,
      });
    }
  });

  app.post("/api/broker/select-account", async (req, res) => {
    try {
      const { accountId, accountNumber } = z
        .object({
          accountId: z.string(),
          // accept numbers but store as string
          accountNumber: z.coerce.string(),
        })
        .parse(req.body);

      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken) {
        return res.status(401).json({ error: "Not connected to broker" });
      }

      await storage.updateBrokerCredential(MOCK_USER_ID, {
        accountId,
        accountNumber,
      });

      // reset cached client so new accountId/number are used
      clearTradeLockerService(MOCK_USER_ID);

      initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!,
        accountNumber,
        accountId
      );

      res.json({ success: true, accountNumber });
    } catch (error: any) {
      res.status(400).json({
        error: "Failed to select account",
        details: error?.message,
      });
    }
  });

  app.get("/api/broker/status", async (req, res) => {
    try {
      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      
      if (!credential) {
        return res.json({ connected: false });
      }

      res.json({
        connected: credential.isConnected,
        broker: credential.broker,
        email: credential.email,
        server: credential.server,
        accountNumber: credential.accountNumber,
        lastConnected: credential.lastConnected,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/broker/disconnect", async (req, res) => {
    try {
      clearTradeLockerService(MOCK_USER_ID);
      await storage.deleteBrokerCredential(MOCK_USER_ID);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/broker/accounts", async (req, res) => {
    try {
      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken) {
        return res.status(401).json({ error: "Not connected to broker" });
      }

      const tradeLocker = initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!
      );

      const accounts = await tradeLocker.getAccounts();
      res.json(
        accounts.map((a) => ({
          id: a.id,
          name: a.name,
          accNum: a.accNum,
          currency: a.currency,
          balance: Number(a.accountBalance ?? (a as any).balance ?? 0),
          equity: Number(a.accountEquity ?? (a as any).equity ?? 0),
        }))
      );
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to fetch accounts",
        details: error?.message,
      });
    }
  });

  app.get("/api/broker/instruments", async (req, res) => {
    try {
      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken) {
        return res.status(401).json({ error: "Not connected to broker" });
      }
      if (!credential.accountNumber) {
        return res.status(409).json({ error: "No account selected. Please select an account first." });
      }

      const tradeLocker = initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!,
        credential.accountNumber,
        credential.accountId
      );

      const instruments = await tradeLocker.getInstruments();
      res.json(instruments);
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to fetch instruments",
        details: error?.message,
      });
    }
  });

  app.get("/api/broker/candles", async (req, res) => {
    try {
      const { symbol, timeframe, count } = req.query;
      
      if (!symbol || !timeframe) {
        return res.status(400).json({ 
          error: "Missing required parameters",
          details: "symbol and timeframe are required" 
        });
      }

      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken) {
        return res.status(401).json({ error: "Not connected to broker" });
      }
      if (!credential.accountNumber) {
        return res.status(409).json({ error: "No account selected" });
      }

      const tradeLocker = initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!,
        credential.accountNumber,
        credential.accountId
      );

      const candlesCount = count ? parseInt(count as string) : 200;
      const candles = await tradeLocker.getHistoricalCandles(
        symbol as string,
        timeframe as string,
        candlesCount
      );

      console.log(`[API /broker/candles] Fetched ${candles.length} candles for ${symbol} (${timeframe})`);
      res.json(candles);
    } catch (error: any) {
      console.error(`[API /broker/candles] Error:`, error.message);
      res.status(500).json({
        error: "Failed to fetch candles",
        details: error?.message,
      });
    }
  });

  app.get("/api/broker/quotes", async (req, res) => {
    const symbols = (req.query.symbols as string)?.split(",") || ["EURUSD"];

    // Helper to provide safe mock data so the UI never hard-crashes when the
    // upstream broker rejects the request (expired token / bad route / sandbox).
    const sendMockQuotes = (reason: string) => {
      console.warn(`[API /broker/quotes] Sending MOCK quotes for ${symbols.join(',')} - Reason: ${reason}`);
      const now = Date.now();
      const mock = symbols.map((s) => ({
        s,
        bid: 2042.12,
        ask: 2042.52,
        timestamp: now,
        source: "mock",
        reason,
      }));
      res.json(mock);
    };

    try {
      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken) {
        return sendMockQuotes("not_connected");
      }
      if (!credential.accountNumber) {
        return sendMockQuotes("no_account_selected");
      }

      const tradeLocker = initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!,
        credential.accountNumber,
        credential.accountId
      );

      const quotes = await tradeLocker.getQuotes(symbols);
      if (!quotes.length) {
        return sendMockQuotes("broker_empty_response");
      }
      
      // Log successful real quotes
      console.log(`[API /broker/quotes] ✅ Received REAL quotes from TradeLocker:`, 
        quotes.map(q => `${q.s}: bid=${q.bid} ask=${q.ask}`).join(', ')
      );
      
      res.json(quotes);
    } catch (error: any) {
      const detail = error?.message || "Unknown error";
      console.error(`[API /broker/quotes] ❌ Error fetching quotes:`, detail);
      // Keep the UI alive with mock quotes but surface the reason in payload.
      sendMockQuotes(detail);
    }
  });

  app.get("/api/broker/positions", async (req, res) => {
    try {
      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken || !credential.accountNumber) {
        // Return empty list instead of 4xx/5xx so the UI stays stable.
        return res.json([]);
      }

      const tradeLocker = initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!,
        credential.accountNumber,
        credential.accountId
      );

      const positions = await tradeLocker.getOpenPositions();
      res.json(Array.isArray(positions) ? positions : []);
    } catch (error: any) {
      // On any broker failure, return empty positions to keep the dashboard rendering.
      res.json([]);
    }
  });

  const placeOrderSchema = z.object({
    instrumentId: z.number(),
    qty: z.number().positive(),
    side: z.enum(["buy", "sell"]),
    type: z.enum(["market", "limit", "stop"]),
    price: z.number().optional(),
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional(),
  });

  app.post("/api/broker/orders", async (req, res) => {
    try {
      const orderData = placeOrderSchema.parse(req.body);
      
      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken) {
        return res.status(401).json({ error: "Not connected to broker" });
      }
      if (!credential.accountNumber) {
        return res.status(409).json({ error: "No account selected. Please select an account first." });
      }

      const riskConfig = await storage.getRiskConfig(MOCK_USER_ID);
      if (riskConfig) {
        const withinWindow = isWithinTradingWindow(
          riskConfig.tradingHoursStart,
          riskConfig.tradingHoursEnd,
        );
        if (!withinWindow) {
          return res.status(409).json({ error: "Trading window closed" });
        }

        const maxLotSize = riskConfig.maxLotSize ? Number(riskConfig.maxLotSize) : undefined;
        if (maxLotSize && orderData.qty > maxLotSize) {
          return res.status(409).json({ error: "Order size exceeds maxLotSize" });
        }

        if (riskConfig.maxPositionSize && orderData.qty > riskConfig.maxPositionSize) {
          return res.status(409).json({ error: "Order size exceeds maxPositionSize" });
        }
      }

      const tradeLocker = initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!,
        credential.accountNumber,
        credential.accountId
      );

      const result = await tradeLocker.placeOrder(orderData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        error: "Failed to place order",
        details: error?.message,
      });
    }
  });

  // Strategy runner controls
  app.post("/api/strategies/:id/activate", async (req, res) => {
    try {
      const strategyId = req.params.id;
      const { dryRun } = z.object({ dryRun: z.boolean().optional() }).parse(req.body ?? {});

      // mark active in DB for visibility (best-effort)
      await storage.updateStrategy(strategyId, { isActive: true });

      await strategyRunner.start(strategyId, { dryRun: dryRun ?? true });
      res.json({ success: true, strategyId, status: strategyRunner.status() });
    } catch (error: any) {
      res.status(400).json({
        error: "Failed to activate strategy",
        details: error?.message,
      });
    }
  });

  app.post("/api/strategies/stop", async (_req, res) => {
    try {
      await strategyRunner.stop();
      // best-effort: mark all inactive for the mock user
      const strategies = await storage.getStrategies(MOCK_USER_ID);
      await Promise.all(strategies.map((s) => storage.updateStrategy(s.id, { isActive: false })));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to stop strategy",
        details: error?.message,
      });
    }
  });

  app.get("/api/strategies/active", async (_req, res) => {
    res.json(strategyRunner.status());
  });

  // Signal endpoints
  app.get("/api/signals", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const symbol = req.query.symbol as string | undefined;
      const strategyId = req.query.strategyId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const signals = await storage.getSignals(MOCK_USER_ID, { status, symbol, strategyId, limit });
      res.json(signals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/signals/:id", async (req, res) => {
    try {
      const signal = await storage.getSignal(req.params.id);
      if (!signal) {
        return res.status(404).json({ error: "Signal not found" });
      }
      res.json(signal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/signals/:id/execute", async (req, res) => {
    try {
      const signal = await storage.getSignal(req.params.id);
      if (!signal) {
        return res.status(404).json({ error: "Signal not found" });
      }
      
      if (signal.status !== 'pending' && signal.status !== 'viewed') {
        return res.status(400).json({ error: "Signal cannot be executed" });
      }

      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken || !credential.accountNumber) {
        return res.status(401).json({ error: "Not connected to broker" });
      }

      const tradeLocker = initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!,
        credential.accountNumber,
        credential.accountId
      );

      // Get instrument ID for the symbol
      const instruments = await tradeLocker.getInstruments();
      const instrument = instruments.find((i: any) => i.symbol === signal.symbol);
      if (!instrument) {
        return res.status(404).json({ error: "Instrument not found" });
      }

      // Place the order
      const orderResult = await tradeLocker.placeOrder({
        instrumentId: instrument.id,
        qty: 0.01, // Default lot size - could be from signal or risk config
        side: signal.direction,
        type: 'market',
        price: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
      });

      // Update signal status
      await storage.updateSignal(signal.id, {
        status: 'executed',
        executedAt: new Date(),
        orderId: orderResult.orderId,
      });

      // Broadcast update via WebSocket
      wsServer.broadcastSignalUpdate(signal.id, { status: 'executed', executedAt: new Date() });

      res.json({ success: true, orderId: orderResult.orderId, signal });
    } catch (error: any) {
      res.status(400).json({
        error: "Failed to execute signal",
        details: error?.message,
      });
    }
  });

  app.post("/api/signals/:id/dismiss", async (req, res) => {
    try {
      const signal = await storage.getSignal(req.params.id);
      if (!signal) {
        return res.status(404).json({ error: "Signal not found" });
      }
      
      if (signal.status !== 'pending' && signal.status !== 'viewed') {
        return res.status(400).json({ error: "Signal cannot be dismissed" });
      }

      await storage.updateSignal(signal.id, { status: 'dismissed' });

      // Broadcast update via WebSocket
      wsServer.broadcastSignalUpdate(signal.id, { status: 'dismissed' });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/signals/:id/view", async (req, res) => {
    try {
      const signal = await storage.getSignal(req.params.id);
      if (!signal) {
        return res.status(404).json({ error: "Signal not found" });
      }
      
      if (signal.status !== 'pending') {
        return res.status(400).json({ error: "Signal already viewed or processed" });
      }

      await storage.updateSignal(signal.id, { status: 'viewed', viewedAt: new Date() });

      // Broadcast update via WebSocket
      wsServer.broadcastSignalUpdate(signal.id, { status: 'viewed', viewedAt: new Date() });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/signals/stats", async (req, res) => {
    try {
      const stats = await storage.getSignalStats(MOCK_USER_ID);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/signals/manual", async (req, res) => {
    try {
      const validatedData = insertTradeSignalSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID,
        status: 'pending',
      });
      
      const signal = await storage.createSignal(validatedData);
      
      // Broadcast via WebSocket
      wsServer.broadcastSignal(signal);
      
      res.json(signal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Signal engine controls
  app.post("/api/signals/start", async (req, res) => {
    try {
      const { strategyIds, symbols, mode, intervalMs, dryRun } = z.object({
        strategyIds: z.array(z.string()),
        symbols: z.array(z.string()),
        mode: z.enum(['realtime', 'periodic']),
        intervalMs: z.number().optional(),
        dryRun: z.boolean().optional(),
      }).parse(req.body);

      const strategies = await Promise.all(
        strategyIds.map(id => storage.getStrategy(id))
      );
      const validStrategies = strategies.filter((s): s is NonNullable<typeof s> => s !== undefined);

      if (validStrategies.length === 0) {
        return res.status(404).json({ error: "No valid strategies found" });
      }

      await signalEngine.start(validStrategies, {
        mode,
        intervalMs,
        symbols,
        dryRun,
      });

      res.json({ success: true, status: signalEngine.status() });
    } catch (error: any) {
      res.status(400).json({
        error: "Failed to start signal engine",
        details: error?.message,
      });
    }
  });

  app.post("/api/signals/stop", async (req, res) => {
    try {
      await signalEngine.stop();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to stop signal engine",
        details: error?.message,
      });
    }
  });

  app.get("/api/signals/engine/status", async (req, res) => {
    res.json(signalEngine.status());
  });

  // Forex.game API endpoints
  app.get("/api/forex/quotes", async (req, res) => {
    try {
      const symbols = (req.query.symbols as string)?.split(",") || ["XAUUSD", "EURUSD", "GBPUSD"];
      const forexGame = getForexGameService();
      const quotes = await forexGame.getQuotes(symbols);
      res.json(quotes);
    } catch (error: any) {
      console.error('[API /forex/quotes] Error:', error);
      res.status(500).json({ error: "Failed to fetch quotes", details: error?.message });
    }
  });

  app.get("/api/forex/candles", async (req, res) => {
    try {
      const { symbol, timeframe = 'H1', count = '200' } = req.query;
      
      if (!symbol || !timeframe) {
        return res.status(400).json({
          error: "Missing required parameters",
          details: "symbol and timeframe are required"
        });
      }

      const forexGame = getForexGameService();
      const candles = await forexGame.getCandles(symbol as string, timeframe as string, parseInt(count as string));
      res.json(candles);
    } catch (error: any) {
      console.error('[API /forex/candles] Error:', error);
      res.status(500).json({ error: "Failed to fetch candles", details: error?.message });
    }
  });

  app.get("/api/forex/accounts", async (req, res) => {
    try {
      const forexGame = getForexGameService();
      const accounts = await forexGame.getAccounts();
      res.json(accounts);
    } catch (error: any) {
      console.error('[API /forex/accounts] Error:', error);
      res.status(500).json({ error: "Failed to fetch accounts", details: error?.message });
    }
  });

  app.post("/api/forex/orders", async (req, res) => {
    try {
      const orderSchema = z.object({
        symbol: z.string(),
        side: z.enum(["buy", "sell"]),
        type: z.enum(["market", "limit", "stop"]),
        quantity: z.number().positive(),
        price: z.number().optional(),
        stopLoss: z.number().optional(),
        takeProfit: z.number().optional(),
      });

      const orderData = orderSchema.parse(req.body);
      const forexGame = getForexGameService();
      const result = await forexGame.placeOrder(orderData);
      
      res.json(result);
    } catch (error: any) {
      console.error('[API /forex/orders] Error:', error);
      res.status(400).json({ error: "Failed to place order", details: error?.message });
    }
  });

  app.get("/api/forex/orders", async (req, res) => {
    try {
      const forexGame = getForexGameService();
      const orders = await forexGame.getOrders();
      res.json(orders);
    } catch (error: any) {
      console.error('[API /forex/orders] Error:', error);
      res.status(500).json({ error: "Failed to fetch orders", details: error?.message });
    }
  });

  return httpServer;
}
