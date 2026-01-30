import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  strategies,
  riskConfigs,
  trades,
  systemLogs,
  backtestResults,
  brokerCredentials,
  tradeSignals,
  signalStats,
  type User,
  type InsertUser,
  type Strategy,
  type InsertStrategy,
  type RiskConfig,
  type InsertRiskConfig,
  type Trade,
  type InsertTrade,
  type SystemLog,
  type InsertSystemLog,
  type BacktestResult,
  type InsertBacktestResult,
  type BrokerCredential,
  type InsertBrokerCredential,
  type TradeSignal,
  type InsertTradeSignal,
  type SignalStat,
  type InsertSignalStat,
} from "@shared/schema";

export const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  ensureUser(userId: string): Promise<void>;

  getStrategies(userId: string): Promise<Strategy[]>;
  getStrategy(id: string): Promise<Strategy | undefined>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, strategy: Partial<InsertStrategy>): Promise<Strategy | undefined>;
  deleteStrategy(id: string): Promise<boolean>;

  getRiskConfig(userId: string): Promise<RiskConfig | undefined>;
  upsertRiskConfig(config: InsertRiskConfig): Promise<RiskConfig>;

  getTrades(userId: string, limit?: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, trade: Partial<InsertTrade>): Promise<Trade | undefined>;

  getSystemLogs(userId: string | null, limit?: number): Promise<SystemLog[]>;
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;

  getBacktestResults(userId: string, strategyId?: string): Promise<BacktestResult[]>;
  createBacktestResult(result: InsertBacktestResult): Promise<BacktestResult>;

  getBrokerCredential(userId: string): Promise<BrokerCredential | undefined>;
  upsertBrokerCredential(credential: InsertBrokerCredential): Promise<BrokerCredential>;
  updateBrokerCredential(userId: string, updates: Partial<InsertBrokerCredential>): Promise<BrokerCredential | undefined>;
  deleteBrokerCredential(userId: string): Promise<boolean>;

  // Trade Signals
  getSignals(userId: string, options?: { status?: string; symbol?: string; strategyId?: string; limit?: number }): Promise<TradeSignal[]>;
  getSignal(id: string): Promise<TradeSignal | undefined>;
  createSignal(signal: InsertTradeSignal): Promise<TradeSignal>;
  updateSignal(id: string, updates: Partial<InsertTradeSignal>): Promise<TradeSignal | undefined>;
  deleteSignal(id: string): Promise<boolean>;

  // Signal Statistics
  getSignalStats(userId: string, date?: Date, strategyId?: string): Promise<SignalStat[]>;
  getSignalStatsForDate(userId: string, date: Date, strategyId?: string): Promise<SignalStat | undefined>;
  upsertSignalStat(stat: InsertSignalStat): Promise<SignalStat>;
}

export class PostgreSQLStorage implements IStorage {
  async ensureUser(userId: string): Promise<void> {
    await db
      .insert(users)
      .values({
        id: userId,
        username: `user_${userId.slice(0, 8)}`,
        password: "placeholder",
      })
      .onConflictDoNothing({ target: users.id });
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getStrategies(userId: string): Promise<Strategy[]> {
    return await db.select().from(strategies).where(eq(strategies.userId, userId)).orderBy(desc(strategies.createdAt));
  }

  async getStrategy(id: string): Promise<Strategy | undefined> {
    const result = await db.select().from(strategies).where(eq(strategies.id, id)).limit(1);
    return result[0];
  }

  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    const result = await db.insert(strategies).values(strategy).returning();
    return result[0];
  }

  async updateStrategy(id: string, strategy: Partial<InsertStrategy>): Promise<Strategy | undefined> {
    const result = await db.update(strategies).set(strategy).where(eq(strategies.id, id)).returning();
    return result[0];
  }

  async deleteStrategy(id: string): Promise<boolean> {
    const result = await db.delete(strategies).where(eq(strategies.id, id)).returning();
    return result.length > 0;
  }

  async getRiskConfig(userId: string): Promise<RiskConfig | undefined> {
    const result = await db.select().from(riskConfigs).where(eq(riskConfigs.userId, userId)).limit(1);
    return result[0];
  }

  async upsertRiskConfig(config: InsertRiskConfig): Promise<RiskConfig> {
    const existing = await this.getRiskConfig(config.userId);
    
    if (existing) {
      const result = await db.update(riskConfigs).set(config).where(eq(riskConfigs.userId, config.userId)).returning();
      return result[0];
    } else {
      const result = await db.insert(riskConfigs).values(config).returning();
      return result[0];
    }
  }

  async getTrades(userId: string, limit: number = 100): Promise<Trade[]> {
    return await db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.entryTime)).limit(limit);
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const result = await db.insert(trades).values(trade).returning();
    return result[0];
  }

  async updateTrade(id: string, trade: Partial<InsertTrade>): Promise<Trade | undefined> {
    const result = await db.update(trades).set(trade).where(eq(trades.id, id)).returning();
    return result[0];
  }

  async getSystemLogs(userId: string | null, limit: number = 100): Promise<SystemLog[]> {
    if (userId) {
      return await db.select().from(systemLogs).where(eq(systemLogs.userId, userId)).orderBy(desc(systemLogs.timestamp)).limit(limit);
    } else {
      return await db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(limit);
    }
  }

  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    const result = await db.insert(systemLogs).values(log).returning();
    return result[0];
  }

  async getBacktestResults(userId: string, strategyId?: string): Promise<BacktestResult[]> {
    if (strategyId) {
      return await db.select().from(backtestResults)
        .where(eq(backtestResults.strategyId, strategyId))
        .orderBy(desc(backtestResults.createdAt));
    } else {
      return await db.select().from(backtestResults)
        .where(eq(backtestResults.userId, userId))
        .orderBy(desc(backtestResults.createdAt));
    }
  }

  async createBacktestResult(result: InsertBacktestResult): Promise<BacktestResult> {
    const dbResult = await db.insert(backtestResults).values(result).returning();
    return dbResult[0];
  }

  async getBrokerCredential(userId: string): Promise<BrokerCredential | undefined> {
    const result = await db.select().from(brokerCredentials).where(eq(brokerCredentials.userId, userId)).limit(1);
    return result[0];
  }

  async upsertBrokerCredential(credential: InsertBrokerCredential): Promise<BrokerCredential> {
    const existing = await this.getBrokerCredential(credential.userId);
    
    if (existing) {
      const result = await db.update(brokerCredentials).set(credential).where(eq(brokerCredentials.userId, credential.userId)).returning();
      return result[0];
    } else {
      const result = await db.insert(brokerCredentials).values(credential).returning();
      return result[0];
    }
  }

  async updateBrokerCredential(userId: string, updates: Partial<InsertBrokerCredential>): Promise<BrokerCredential | undefined> {
    const result = await db.update(brokerCredentials).set(updates).where(eq(brokerCredentials.userId, userId)).returning();
    return result[0];
  }

  async deleteBrokerCredential(userId: string): Promise<boolean> {
    const result = await db.delete(brokerCredentials).where(eq(brokerCredentials.userId, userId)).returning();
    return result.length > 0;
  }

  // Trade Signals methods
  async getSignals(userId: string, options: { status?: string; symbol?: string; strategyId?: string; limit?: number } = {}): Promise<TradeSignal[]> {
    let query = db.select().from(tradeSignals).where(eq(tradeSignals.userId, userId));
    
    if (options.status) {
      query = query.where(eq(tradeSignals.status, options.status));
    }
    if (options.symbol) {
      query = query.where(eq(tradeSignals.symbol, options.symbol));
    }
    if (options.strategyId) {
      query = query.where(eq(tradeSignals.strategyId, options.strategyId));
    }
    
    return await query.orderBy(desc(tradeSignals.timestamp)).limit(options.limit ?? 100);
  }

  async getSignal(id: string): Promise<TradeSignal | undefined> {
    const result = await db.select().from(tradeSignals).where(eq(tradeSignals.id, id)).limit(1);
    return result[0];
  }

  async createSignal(signal: InsertTradeSignal): Promise<TradeSignal> {
    const result = await db.insert(tradeSignals).values(signal).returning();
    return result[0];
  }

  async updateSignal(id: string, updates: Partial<InsertTradeSignal>): Promise<TradeSignal | undefined> {
    const result = await db.update(tradeSignals).set(updates).where(eq(tradeSignals.id, id)).returning();
    return result[0];
  }

  async deleteSignal(id: string): Promise<boolean> {
    const result = await db.delete(tradeSignals).where(eq(tradeSignals.id, id)).returning();
    return result.length > 0;
  }

  // Signal Statistics methods
  async getSignalStats(userId: string, date?: Date, strategyId?: string): Promise<SignalStat[]> {
    let query = db.select().from(signalStats).where(eq(signalStats.userId, userId));
    
    if (date) {
      query = query.where(eq(signalStats.date, date));
    }
    if (strategyId) {
      query = query.where(eq(signalStats.strategyId, strategyId));
    }
    
    return await query.orderBy(desc(signalStats.date));
  }

  async getSignalStatsForDate(userId: string, date: Date, strategyId?: string): Promise<SignalStat | undefined> {
    const conditions = [eq(signalStats.userId, userId), eq(signalStats.date, date)];
    
    if (strategyId) {
      conditions.push(eq(signalStats.strategyId, strategyId));
    } else {
      conditions.push(sql`(${signalStats.strategyId} IS NULL)`);
    }
    
    const result = await db.select().from(signalStats).where(and(...conditions)).limit(1);
    return result[0];
  }

  async upsertSignalStat(stat: InsertSignalStat): Promise<SignalStat> {
    const existing = await this.getSignalStatsForDate(stat.userId, stat.date, stat.strategyId ?? undefined);
    
    if (existing) {
      const result = await db.update(signalStats).set(stat).where(eq(signalStats.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await db.insert(signalStats).values(stat).returning();
      return result[0];
    }
  }
}

export const storage = new PostgreSQLStorage();
