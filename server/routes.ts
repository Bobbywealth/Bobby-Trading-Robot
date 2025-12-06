import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertStrategySchema,
  insertRiskConfigSchema,
  insertTradeSchema,
  insertSystemLogSchema,
  insertBacktestResultSchema,
} from "@shared/schema";

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

  return httpServer;
}
