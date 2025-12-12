import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createTradeLockerService, getTradeLockerService, clearTradeLockerService, initializeTradeLockerService } from "./tradelocker";
import {
  insertStrategySchema,
  insertRiskConfigSchema,
  insertTradeSchema,
  insertSystemLogSchema,
  insertBacktestResultSchema,
  insertBrokerCredentialSchema,
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
  const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

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
          balance: a.accountBalance,
          equity: a.accountEquity,
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
          accountNumber: z.number(),
        })
        .parse(req.body);

      const credential = await storage.getBrokerCredential(MOCK_USER_ID);
      if (!credential || !credential.accessToken) {
        return res.status(401).json({ error: "Not connected to broker" });
      }

      await storage.updateBrokerCredential(MOCK_USER_ID, {
        accountId,
        accountNumber: String(accountNumber),
      });

      initializeTradeLockerService(
        MOCK_USER_ID,
        credential.server,
        credential.accessToken,
        credential.refreshToken!,
        accountNumber
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
          balance: a.accountBalance,
          equity: a.accountEquity,
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
        parseInt(credential.accountNumber)
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

  app.get("/api/broker/quotes", async (req, res) => {
    try {
      const symbols = (req.query.symbols as string)?.split(",") || ["EURUSD"];
      
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
        parseInt(credential.accountNumber)
      );

      const quotes = await tradeLocker.getQuotes(symbols);
      res.json(quotes);
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to fetch quotes",
        details: error?.message,
      });
    }
  });

  app.get("/api/broker/positions", async (req, res) => {
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
        parseInt(credential.accountNumber)
      );

      const positions = await tradeLocker.getOpenPositions();
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to fetch positions",
        details: error?.message,
      });
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
        parseInt(credential.accountNumber)
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

  return httpServer;
}
