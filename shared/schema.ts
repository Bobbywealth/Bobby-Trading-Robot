import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, numeric, integer, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const strategies = pgTable("strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  parameters: jsonb("parameters"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertStrategySchema = createInsertSchema(strategies).omit({
  id: true,
  createdAt: true,
});

export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategies.$inferSelect;

export const riskConfigs = pgTable("risk_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  maxDailyLossDollar: numeric("max_daily_loss_dollar"),
  maxDailyLossPercent: numeric("max_daily_loss_percent"),
  maxPositionSize: integer("max_position_size"),
  maxLotSize: numeric("max_lot_size"),
  tradingHoursStart: text("trading_hours_start"),
  tradingHoursEnd: text("trading_hours_end"),
  newsFilterEnabled: boolean("news_filter_enabled").default(false),
  assetBlacklist: text("asset_blacklist").array(),
});

export const insertRiskConfigSchema = createInsertSchema(riskConfigs).omit({
  id: true,
});

export type InsertRiskConfig = z.infer<typeof insertRiskConfigSchema>;
export type RiskConfig = typeof riskConfigs.$inferSelect;

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  strategyId: varchar("strategy_id").references(() => strategies.id),
  orderId: text("order_id"),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  exitPrice: numeric("exit_price"),
  quantity: numeric("quantity").notNull(),
  entryTime: timestamp("entry_time").notNull().default(sql`now()`),
  exitTime: timestamp("exit_time"),
  pnl: numeric("pnl"),
  status: text("status").notNull().default('OPEN'),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  entryTime: true,
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  level: text("level").notNull(),
  module: text("module").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

export const backtestResults = pgTable("backtest_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  strategyId: varchar("strategy_id").notNull().references(() => strategies.id),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalTrades: integer("total_trades").notNull(),
  winRate: numeric("win_rate").notNull(),
  totalPnl: numeric("total_pnl").notNull(),
  maxDrawdown: numeric("max_drawdown").notNull(),
  sharpeRatio: numeric("sharpe_ratio"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertBacktestResultSchema = createInsertSchema(backtestResults).omit({
  id: true,
  createdAt: true,
});

export type InsertBacktestResult = z.infer<typeof insertBacktestResultSchema>;
export type BacktestResult = typeof backtestResults.$inferSelect;

export const brokerCredentials = pgTable("broker_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  broker: text("broker").notNull().default("tradelocker"),
  email: text("email").notNull(),
  server: text("server").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accountId: text("account_id"),
  accountNumber: text("account_number"),
  isConnected: boolean("is_connected").default(false),
  lastConnected: timestamp("last_connected"),
});

export const insertBrokerCredentialSchema = createInsertSchema(brokerCredentials).omit({
  id: true,
});

export type InsertBrokerCredential = z.infer<typeof insertBrokerCredentialSchema>;
export type BrokerCredential = typeof brokerCredentials.$inferSelect;

// Trade signals generated by strategies
export const tradeSignals = pgTable("trade_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  strategyId: varchar("strategy_id").notNull().references(() => strategies.id),
  strategyName: text("strategy_name").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(), // 'buy' or 'sell'
  entryPrice: numeric("entry_price").notNull(),
  stopLoss: numeric("stop_loss"),
  takeProfit: numeric("take_profit"),
  confidence: integer("confidence").notNull(), // 0-100
  reasoning: text("reasoning").notNull(), // Detailed analysis
  indicators: jsonb("indicators"), // Technical indicator data
  timeframe: text("timeframe").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  status: text("status").notNull().default('pending'), // pending, viewed, executed, dismissed, expired
  viewedAt: timestamp("viewed_at"),
  executedAt: timestamp("executed_at"),
  expiresAt: timestamp("expires_at"),
  orderId: text("order_id"), // Link to executed order
  pnl: numeric("pnl"), // Result if executed
});

export const insertTradeSignalSchema = createInsertSchema(tradeSignals).omit({
  id: true,
  timestamp: true,
});

export type InsertTradeSignal = z.infer<typeof insertTradeSignalSchema>;
export type TradeSignal = typeof tradeSignals.$inferSelect;

// Signal statistics for analytics
export const signalStats = pgTable("signal_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  strategyId: varchar("strategy_id").references(() => strategies.id),
  date: date("date").notNull(),
  totalSignals: integer("total_signals").notNull(),
  executedSignals: integer("executed_signals").notNull(),
  winningSignals: integer("winning_signals").notNull(),
  avgConfidence: numeric("avg_confidence"),
  totalPnl: numeric("total_pnl"),
});

export const insertSignalStatSchema = createInsertSchema(signalStats).omit({
  id: true,
});

export type InsertSignalStat = z.infer<typeof insertSignalStatSchema>;
export type SignalStat = typeof signalStats.$inferSelect;
