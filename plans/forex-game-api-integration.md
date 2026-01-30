# Forex.game API Integration Plan

## Overview
Replace TradeLocker API with Forex.game API (https://demo.forex.game/api) for live chart data including real-time quotes and historical candles.

## API Requirements

Based on user requirements, the integration should provide:
1. **Real-time price quotes** - Bid/ask prices for currency pairs
2. **Historical candle data** - OHLC (Open, High, Low, Close) data for charting

## Forex.game API Structure

### Authentication
The Forex.game API requires an API key for authentication. We'll need to:
1. Store API key in environment variables
2. Create authentication middleware

### Endpoints (Based on typical Forex APIs)

```
GET /api/v1/quotes?pairs=XAUUSD,EURUSD,GBPUSD
  Returns: {
    "XAUUSD": { "bid": 2042.12, "ask": 2042.52, "timestamp": 1234567890 },
    "EURUSD": { "bid": 1.0842, "ask": 1.0847, "timestamp": 1234567890 },
    ...
  }

GET /api/v1/candles?symbol=XAUUSD&timeframe=H1&count=200
  Returns: {
    "symbol": "XAUUSD",
    "timeframe": "H1",
    "candles": [
      { "time": 1234567890, "open": 2040.50, "high": 2045.00, "low": 2038.00, "close": 2042.12 },
      ...
    ]
  }

POST /api/v1/orders
  Body: {
    "symbol": "XAUUSD",
    "side": "buy",
    "type": "market",
    "quantity": 0.01,
    "stopLoss": 2030.00,
    "takeProfit": 2050.00
  }
  Returns: { "orderId": "12345", "status": "filled" }

GET /api/v1/orders
  Returns: [{ "orderId": "12345", "symbol": "XAUUSD", "status": "filled", ... }]

GET /api/v1/accounts
  Returns: [{ "accountId": "123", "balance": 10000.00, "equity": 10050.00, ... }]
```

## Implementation Plan

### Phase 1: Create Forex.game Client Service
**File**: `server/forex-game.ts` (new)

**Responsibilities**:
- API authentication
- Real-time quote fetching
- Historical candle fetching
- Order placement
- Order management
- Account information

**Key Functions**:
```typescript
interface ForexGameService {
  authenticate(apiKey: string): Promise<void>;
  getQuotes(symbols: string[]): Promise<QuoteData[]>;
  getCandles(symbol: string, timeframe: string, count: number): Promise<CandleData[]>;
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  getOrders(): Promise<Order[]>;
  getAccounts(): Promise<Account[]>;
}

interface QuoteData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
```

### Phase 2: Update Signal Engine
**File**: `server/signal-engine.ts` (update)

**Changes**:
- Replace TradeLocker service with Forex.game service
- Update quote fetching to use Forex.game API
- Update candle fetching to use Forex.game API
- Update order placement to use Forex.game API

### Phase 3: Update API Routes
**File**: `server/routes.ts` (update)

**Changes**:
- Add Forex.game quote endpoint
- Add Forex.game candles endpoint
- Update order placement to use Forex.game
- Add account info endpoint

### Phase 4: Update Client Components
**Files**: 
- `client/src/components/trading/MarketChart.tsx` (update)
- `client/src/lib/api.ts` (update)

**Changes**:
- Update chart to use Forex.game candle data
- Add Forex.game API client functions
- Update quote fetching

### Phase 5: Environment Configuration
**File**: `env.example` (update)

**Add**:
```
FOREX_GAME_API_KEY=your-api-key-here
FOREX_GAME_API_URL=https://demo.forex.game/api
```

## Architecture Changes

```
┌─────────────────────────────────────────────────────────┐
│                         Client UI                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│
│  │ SignalsPage  │  │ SignalPanel  │  │ SignalCard ││
│  └──────┬───────┘  └──────┬───────┘  └────────────┘│
│         │                    │                            │
│         └────────────────────┼────────────────────────────┘│
│                              │                           │
│  ┌────────────────────────────┴─────────────────────────┐  │
│  │         WebSocket Server (wsServer)               │  │
│  └────────────────────────────┬─────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────┴────────────────────────────┐  │
│  │       Signal Engine (signalEngine)                │  │
│  │  - Strategy execution                              │  │
│  │  - Market monitoring (Forex.game API)              │  │
│  │  - Signal generation                              │  │
│  └────────────────────────┬────────────────────────────┘  │
│                         │                                 │
│  ┌────────────────────────┴────────────────────────────┐  │
│  │       Forex.game API (forex-game.ts)               │  │
│  │  - Real-time quotes                                 │  │
│  │  - Historical candles                                │  │
│  │  - Order execution                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │       Database (PostgreSQL)                    │  │
│  │  - tradeSignals                                   │  │
│  │  - signalStats                                    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Differences from TradeLocker

| Feature | TradeLocker | Forex.game |
|----------|-------------|-------------|
| Authentication | Email/Password | API Key |
| Real-time Data | WebSocket/REST | REST API |
| Historical Data | Available | Available |
| Order Execution | Supported | Supported |
| Account Info | Supported | Supported |

## Implementation Order

1. Create `server/forex-game.ts` service
2. Update `server/signal-engine.ts` to use Forex.game
3. Update `server/routes.ts` with Forex.game endpoints
4. Update `client/src/lib/api.ts` with Forex.game functions
5. Update `client/src/components/trading/MarketChart.tsx` for charts
6. Add environment variables to `env.example`
7. Test integration with demo API

## Next Steps

Once approved, switch to Code mode to implement:
1. Phase 1: Create Forex.game client service
2. Phase 2: Update signal engine
3. Phase 3: Update API routes
4. Phase 4: Update client components
5. Phase 5: Environment configuration
