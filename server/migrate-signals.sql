-- Database Migration for Trade Signals System
-- Run this migration to create the new tables for the signal system

-- Create trade_signals table
CREATE TABLE IF NOT EXISTS trade_signals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  strategy_id VARCHAR NOT NULL REFERENCES strategies(id),
  strategy_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price NUMERIC NOT NULL,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT NOT NULL,
  indicators JSONB,
  timeframe TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'executed', 'dismissed', 'expired')),
  viewed_at TIMESTAMP,
  executed_at TIMESTAMP,
  expires_at TIMESTAMP,
  order_id TEXT,
  pnl NUMERIC
);

-- Create indexes for trade_signals
CREATE INDEX IF NOT EXISTS idx_signals_user ON trade_signals(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_status ON trade_signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON trade_signals(symbol);

-- Create signal_stats table
CREATE TABLE IF NOT EXISTS signal_stats (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  strategy_id VARCHAR REFERENCES strategies(id),
  date DATE NOT NULL,
  total_signals INTEGER NOT NULL,
  executed_signals INTEGER NOT NULL,
  winning_signals INTEGER NOT NULL,
  avg_confidence NUMERIC,
  total_pnl NUMERIC
);

-- Create unique constraint for signal_stats
CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_user_strategy_date ON signal_stats(user_id, COALESCE(strategy_id, ''), date);
