# Chart Data Source Debugging Guide

## Problem Overview

The chart on `/robot` (Dashboard) may show prices that differ from TradingView or your broker's platform. This is because **historical candles are simulated** while only the **current/latest candle uses real broker data**.

---

## Current Implementation Status

### ✅ What Works
- **Live price quotes** from TradeLocker broker (bid/ask) are fetched every 1 second
- **Current candle** is updated in real-time with real broker data
- **Visual indicators** show when data is simulated vs live
- **Console logging** provides detailed debugging information

### ⚠️ Known Limitations
- **Historical candles (all but the latest)** are SIMULATED/GENERATED locally
- Chart shows 200 fake candles with random price movements
- Historical data starts from 2023-01-01 (not real time)
- Only candles created AFTER connecting to broker are real

---

## Why This Happens

### Root Cause
The `MarketChart.tsx` component uses a `generateData()` function that creates synthetic OHLC candles because:

1. **No Historical Data API**: TradeLocker may not provide a historical candles/bars endpoint
2. **No Local Storage**: We don't store historical candles in the database yet
3. **Bootstrap Problem**: Need to show something before enough live candles accumulate

### Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│ 1. User opens dashboard                                     │
│    ↓                                                         │
│ 2. Chart initializes with 200 FAKE candles                  │
│    (generateData() creates random price movements)          │
│    ↓                                                         │
│ 3. If connected: fetch live price from TradeLocker          │
│    (/api/broker/quotes → TradeLocker API)                   │
│    ↓                                                         │
│ 4. Update ONLY the last candle with real data               │
│    (previous 199 candles remain fake)                       │
│    ↓                                                         │
│ 5. Every 1 second: fetch new quotes and update last candle  │
│    ↓                                                         │
│ 6. When timeframe interval passes: create NEW real candle   │
│    (this one is 100% from broker feed)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## How to Debug Data Discrepancies

### Step 1: Check Visual Indicators on Chart

Look at the chart header badges:
- 🟢 **LIVE** = Connected to broker, receiving real quotes
- 🔴 **DEMO** = Not connected, using mock data
- 🟡 **Historical: Simulated** = Historical candles are fake
- 🟢 **X Live Candles** = Number of real candles created from broker feed
- ⚠️ **Mock** warning next to price = Quote is fallback/mock data

### Step 2: Open Browser Console

Press `F12` or `Cmd+Option+I` to open DevTools Console.

#### Quick Debug Command

Type this in console for instant snapshot:
```javascript
window.__chartDebug.getInfo()
```

This will show:
- Current symbol and timeframe
- Connection status
- Live price from broker
- Total candles vs real candles
- Price difference between broker and chart
- Full last candle data

#### Automatic Console Logs

Look for:

#### Chart Initialization Logs
```
[MarketChart] Initializing chart with LIVE price seed: {
  symbol: "XAUUSD",
  timeframe: "1h",
  brokerBid: 2645.23,
  brokerAsk: 2645.67,
  brokerMid: "2645.45",
  timestamp: "2025-12-13T...",
  source: "tradelocker"
}
[MarketChart] Generated 200 SIMULATED historical candles for XAUUSD (1h)
[MarketChart] ⚠️  WARNING: Historical candles are SIMULATED...
```

#### Live Quote Updates
```
[MarketChart] Live quote update: {
  symbol: "XAUUSD",
  brokerBid: "2645.23",
  brokerAsk: "2645.67",
  brokerMid: "2645.45",
  chartDisplayPrice: "2645.45",
  priceDiff: "0.00",
  isNewCandle: false,
  timestamp: "2025-12-13T...",
  source: "tradelocker"
}
```

#### Backend API Logs (if running locally)
```
[API /broker/quotes] ✅ Received REAL quotes from TradeLocker: XAUUSD: bid=2645.23 ask=2645.67
```

or

```
[API /broker/quotes] Sending MOCK quotes for XAUUSD - Reason: not_connected
```

### Step 3: Compare Broker Feed vs Chart Display

In console logs, check:

1. **brokerBid / brokerAsk** = Raw data from TradeLocker API
2. **brokerMid** = Calculated mid-price `(bid + ask) / 2`
3. **chartDisplayPrice** = What the chart is currently showing
4. **priceDiff** = Difference between new quote and chart price
5. **source** = `"tradelocker"` (real) or `"mock"` (fallback)
6. **reason** = If mock, why? (e.g., "not_connected", "broker_empty_response")

### Step 4: Verify Symbol Matches

The chart's selected symbol must match what you're comparing it to:

- **XAUUSD** (Spot Gold) ≠ **GOLD** (Futures) ≠ **XAU/USD** (CFD)
- Different brokers/feeds use different symbols
- TradeLocker symbol may differ from TradingView symbol
- Check `symbol` in console logs vs your comparison source

### Step 5: Check Timezone and Session Settings

- Chart uses broker's server time (from `timestamp` field)
- TradingView may use different timezone
- Weekend/closed market data may show last known price
- Check if market is open: logs show `timestamp` for each quote

---

## Solutions and Workarounds

### Immediate Workarounds

#### 1. Wait for Live Candles to Accumulate
- Let the bot run for several hours/days
- Old fake candles will scroll off the chart
- Eventually all visible candles will be real

#### 2. Focus on Latest Candle Only
- The rightmost candle is always real (when connected)
- Use it for trading decisions, ignore historical context
- Compare ONLY the live price display vs broker

#### 3. Use External Charts
- Keep TradingView or broker platform open
- Use this chart only for quick reference
- Make trading decisions based on real charts

### Proper Long-Term Solutions

#### Option A: Fetch Real Historical Data from TradeLocker

**If TradeLocker has a candles API:**
1. Research TradeLocker API docs for historical bars endpoint
2. Add `getHistoricalCandles()` method to `server/tradelocker.ts`
3. Create backend route `/api/broker/candles?symbol=X&timeframe=1h&count=200`
4. Update `MarketChart.tsx` to fetch real data instead of generating

**Example API research:**
```typescript
// Check if TradeLocker supports:
GET /backend-api/trade/instruments/{id}/candles?routeId={infoRouteId}&interval=1h&count=200
```

#### Option B: Store Live Candles in Database

**Continuously save incoming candles:**
1. Create `candles` table in database schema
2. Every time a new candle closes, save it to DB
3. On chart load, fetch last 200 candles from DB
4. Gradually build up real historical data over time

**Implementation:**
```sql
CREATE TABLE candles (
  id INTEGER PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  UNIQUE(symbol, timeframe, timestamp)
);
```

#### Option C: Use Third-Party Data Provider

**Alternative data sources:**
- [Polygon.io](https://polygon.io/) - Real-time and historical data
- [Alpha Vantage](https://www.alphavantage.co/) - Free tier available
- [Twelve Data](https://twelvedata.com/) - Forex and commodities
- [Yahoo Finance API](https://finance.yahoo.com/) - Free, limited

**Implementation:**
1. Sign up for API key
2. Create data provider service similar to `tradelocker.ts`
3. Fetch historical candles on chart init
4. Use TradeLocker for live updates, third-party for history

---

## Testing Checklist

When debugging chart data issues, verify:

- [ ] Browser console shows `source: "tradelocker"` (not "mock")
- [ ] `reason` field is not present (indicates real data)
- [ ] `brokerBid` and `brokerAsk` are different from hardcoded 2042.12/2042.52
- [ ] `priceDiff` changes over time (not always 0)
- [ ] `isNewCandle: true` appears when timeframe interval passes
- [ ] Live Candles count badge increases over time
- [ ] Chart price matches `/api/broker/quotes` API response
- [ ] No 401/404 errors in Network tab for quotes endpoint
- [ ] Account is selected (check `/api/broker/status` returns accountNumber)
- [ ] Symbol dropdown shows real instruments from broker
- [ ] Switching symbols updates the price feed immediately

---

## FAQ

### Q: Why does the chart show different prices than TradingView?

**A:** Three main reasons:
1. **Historical candles are fake** - only the latest candle is real
2. **Different data sources** - TradingView uses their feed, you're using TradeLocker
3. **Symbol mismatch** - XAUUSD vs GOLD vs XAU/USD are different instruments

### Q: How can I tell if I'm getting real broker data?

**A:** Check these indicators:
- Console shows `source: "tradelocker"` (not "mock")
- No yellow "Mock" warning next to bid/ask prices
- Green "LIVE" badge (not gray "DEMO")
- Prices change in real-time (not frozen)

### Q: Why do prices look old or frozen?

**A:** Possible causes:
- Market is closed (weekends, holidays)
- Token expired - reconnect via `/connect` page
- Network issue - check browser Network tab
- Mock data fallback - check console for `reason` field

### Q: Can I trust this chart for live trading?

**A:** **Only for the current price**:
- ✅ Current price display (bid/ask) is real
- ✅ Latest candle is real when connected
- ❌ Historical candles are simulated
- ❌ Historical patterns/indicators are unreliable
- **Recommendation:** Use external chart for analysis, this for monitoring

### Q: When will this be fixed properly?

**A:** Depends on TradeLocker's API:
- **If they have candles API**: Can be implemented in ~1-2 days
- **If not**: Need to implement database storage (1-2 weeks)
- **Alternative**: Integrate third-party provider (2-3 days)

---

## Next Steps for Developers

### Priority 1: Investigate TradeLocker Historical Data API
1. Check TradeLocker API documentation
2. Test if `/backend-api/trade/instruments/{id}/candles` exists
3. Try different endpoint patterns (bars, ohlc, history, etc.)
4. If found, implement in `tradelocker.ts`

### Priority 2: Add Database Storage for Live Candles
1. Create candles table in schema
2. Save closed candles to DB from live feed
3. Fetch recent candles on chart load
4. Implement cleanup/archival for old data

### Priority 3: Improve Visual Warnings
- ✅ Added badges showing simulated data
- ✅ Added console logging for debugging
- ✅ Added mock data detection
- 🔲 Add prominent banner when >50% data is simulated
- 🔲 Add settings to hide chart until enough live data

### Priority 4: Add Comparison Tool
- 🔲 Add side-by-side view: Chart vs TradingView embed
- 🔲 Show price difference percentage
- 🔲 Add "Sync with TradingView" button to match symbol/timeframe
- 🔲 Export logs for support/debugging

---

## Support and Resources

- **TradeLocker API Docs**: [https://tradelocker.com/api](https://tradelocker.com/api) (if available)
- **GitHub Issues**: Report chart bugs with console logs attached
- **Console Logs**: Always include when reporting price discrepancies
- **Network Tab**: Inspect `/api/broker/quotes` responses

---

*Last updated: December 13, 2025*
