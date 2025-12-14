# Quick Start: Chart Data Debugging

## 🎯 Problem Identified

Your chart on `/robot` shows **simulated historical data** instead of real market data. Only the **latest candle** uses real TradeLocker quotes.

## ✅ What I Fixed

### 1. Visual Indicators (No Console Needed)

Open your dashboard and look for these badges on the chart:

```
[Symbol] XAUUSD  Live price
  🟢 LIVE  🟡 Historical: Simulated  🟢 5 Live Candles
```

**What they mean:**
- 🟢 **LIVE** = Connected to TradeLocker, receiving real quotes
- 🟡 **Historical: Simulated** = Old candles are fake (generated locally)
- 🟢 **X Live Candles** = How many real candles from broker (increases over time)

### 2. Warning Banner

When you have less than 10 live candles, you'll see:

```
⚠️ Historical candles are SIMULATED (generated locally). 
   Only new candles use real broker data. (5 live so far)
```

This warning auto-hides once you have enough real data.

### 3. Console Logging (For Debugging)

Press `F12` and type:

```javascript
window.__chartDebug.getInfo()
```

You'll see:
```
🔍 Chart Debug Info
  Symbol: XAUUSD
  Connected: true
  Live Price: {bid: 2645.23, ask: 2645.67, source: "tradelocker"}
  Total Candles: 200
  Real Candles: 5
  Fake Candles: 195
  Historical Data: ⚠️ SIMULATED
  Price Difference: 0.12 ✅ OK
```

### 4. Automatic Logs

Every second, the console shows:

```javascript
[MarketChart] Live quote update: {
  symbol: "XAUUSD",
  brokerBid: "2645.23",    // ← Real from TradeLocker
  brokerAsk: "2645.67",    // ← Real from TradeLocker
  chartDisplayPrice: "2645.45",  // ← What chart shows
  priceDiff: "0.00",       // ← Difference (should be small)
  source: "tradelocker"    // ← Real or "mock"
}
```

**Backend also logs:**
```javascript
[API /broker/quotes] ✅ Received REAL quotes from TradeLocker: XAUUSD: bid=2645.23 ask=2645.67
```

or if something's wrong:
```javascript
[API /broker/quotes] Sending MOCK quotes for XAUUSD - Reason: not_connected
```

---

## 🔍 How to Verify It's Working

### Test 1: Check Connection (30 seconds)

1. Open `/robot` dashboard
2. Look at chart header badges:
   - ✅ Should show green **LIVE** badge
   - ✅ Should show yellow **Historical: Simulated**
   - ✅ Should show **0 Live Candles** initially
3. If you see gray **DEMO** instead:
   - Go to `/connect` page
   - Connect your broker account
   - Select an account from the dropdown

### Test 2: Verify Real Data (1 minute)

1. Press `F12` to open console
2. Type: `window.__chartDebug.getInfo()`
3. Check the output:
   - ✅ `Connected: true`
   - ✅ `Live Price: {source: "tradelocker"}` (not "mock")
   - ✅ `Price Difference: X.XX ✅ OK` (should be < 1.0)
4. Watch the automatic logs for 30 seconds:
   - ✅ Should see `[MarketChart] Live quote update` every 1-2 seconds
   - ✅ `source: "tradelocker"` in each log
   - ✅ Prices changing slightly over time

### Test 3: Wait for First Live Candle (depends on timeframe)

1. Note your timeframe (M1, M5, M15, H1, H4)
2. Wait for that interval to pass:
   - M1 (1 minute) = wait 1-2 minutes
   - M5 (5 minutes) = wait 5-6 minutes
   - H1 (1 hour) = wait 60-65 minutes
3. When the interval passes, you should see:
   - ✅ Console: `[MarketChart] ✅ New LIVE candle created`
   - ✅ Badge updates: **1 Live Candle** → **2 Live Candles**
   - ✅ New candle appears on chart

---

## 🚨 Troubleshooting

### Chart shows "DEMO" but I'm connected

**Solution:**
1. Go to `/connect` page
2. Make sure you **selected** an account (not just logged in)
3. Refresh the page
4. Check console: `window.__chartDebug.getInfo()` → should show `Connected: true`

### Console shows `source: "mock"`

**Check the `reason` field in the log:**

| Reason | Solution |
|--------|----------|
| `not_connected` | Click "Connect broker" button |
| `no_account_selected` | Go to `/connect` and select account |
| `broker_empty_response` | Symbol might not be available, try different symbol |
| Contains `401` or `expired` | Token expired, reconnect broker |

### Prices don't match TradingView

**Two scenarios:**

**1. All candles look wrong (EXPECTED):**
- Historical candles are simulated (this is normal)
- Only affects old candles, not current price
- Wait for live candles to accumulate

**2. Current price is wrong (PROBLEM):**
- Check console: `window.__chartDebug.getInfo()`
- Look at `Price Difference:` in output
- If > $5 for gold, check:
  - Symbol matches (XAUUSD vs GOLD vs XAU/USD)
  - Market is open (not weekend/holiday)
  - `source: "tradelocker"` (not "mock")

---

## 📊 Understanding the Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ INITIAL LOAD (First 2 seconds)                          │
├─────────────────────────────────────────────────────────┤
│ 1. Chart generates 200 FAKE candles                     │
│    └─> Random price movements, starting from 2023       │
│                                                          │
│ 2. Fetch current price from TradeLocker                 │
│    └─> GET /api/broker/quotes?symbols=XAUUSD            │
│    └─> Returns: {bid: 2645.23, ask: 2645.67}           │
│                                                          │
│ 3. Seed fake data with real current price               │
│    └─> Last fake candle adjusted to ~2645.45            │
│                                                          │
│ Result: 200 candles visible, 199 are FAKE, 1 is REAL   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ LIVE UPDATES (Every 1 second)                           │
├─────────────────────────────────────────────────────────┤
│ 1. Fetch current quote from TradeLocker                 │
│    └─> {bid: 2645.25, ask: 2645.69} (slightly changed) │
│                                                          │
│ 2. Update last candle with new data                     │
│    └─> high = max(old high, new price)                  │
│    └─> low = min(old low, new price)                    │
│    └─> close = new price                                │
│                                                          │
│ 3. Log to console for debugging                         │
│    └─> [MarketChart] Live quote update: {...}           │
│                                                          │
│ Result: Last candle updates in real-time                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ NEW CANDLE (Every timeframe interval)                   │
├─────────────────────────────────────────────────────────┤
│ 1. Timeframe interval passes (e.g., 1 hour for H1)     │
│                                                          │
│ 2. Create NEW candle from current price                 │
│    └─> open/high/low/close = current broker price       │
│                                                          │
│ 3. Increment live candle counter                        │
│    └─> liveCandleCount: 5 → 6                           │
│                                                          │
│ 4. Update badge: "6 Live Candles"                       │
│                                                          │
│ 5. Log: ✅ New LIVE candle created                      │
│                                                          │
│ Result: One more REAL candle, one less visible FAKE     │
└─────────────────────────────────────────────────────────┘

After 200 intervals, ALL visible candles are real! 🎉
(But this takes 200 hours for H1, 200 minutes for M1, etc.)
```

---

## 📈 What to Expect Over Time

| Time Elapsed | M1 Timeframe | H1 Timeframe | Data Quality |
|--------------|--------------|--------------|--------------|
| 0 min | 0 live / 200 fake | 0 live / 200 fake | ⚠️ Historical only |
| 1 min | 1 live / 199 fake | 0 live / 200 fake | ⚠️ 0.5% real |
| 5 min | 5 live / 195 fake | 0 live / 200 fake | ⚠️ 2.5% real |
| 30 min | 30 live / 170 fake | 0 live / 200 fake | ⚠️ 15% real |
| 1 hour | 60 live / 140 fake | 1 live / 199 fake | ⚠️ 30% real |
| 4 hours | 200+ live | 4 live / 196 fake | ✅ M1 fully real |
| 1 day | All real | 24 live / 176 fake | ⚠️ H1 12% real |
| 1 week | All real | 168 live / 32 fake | ✅ H1 84% real |
| 9 days | All real | 200+ live | ✅ All fully real |

**Key Insight:** Use shorter timeframes (M1, M5) to get real data faster!

---

## 🎯 Recommended Usage

### ✅ SAFE to Use For:
- Current price monitoring
- Current candle analysis
- Live bid/ask spread
- Recent price action (last 1-2 hours on M1)
- Testing your bot with live data

### ⚠️ USE WITH CAUTION:
- Pattern recognition (older candles are fake)
- Support/resistance levels (based on fake data)
- Historical indicator values (EMA/SMA of fake data)
- Backtesting strategies (need real historical data)

### ❌ DO NOT Use For:
- Historical analysis (anything > a few hours ago)
- Long-term pattern identification
- Comparing to TradingView historical charts
- Making decisions based on old candles

**Recommendation:** Keep TradingView or broker platform open for historical analysis. Use this chart for:
1. Current price monitoring
2. Quick live updates
3. Bot signal visualization
4. Real-time order placement

---

## 📚 More Information

- **Full debugging guide**: See `CHART_DATA_DEBUGGING.md`
- **Implementation details**: See `CHART_FIX_SUMMARY.md`
- **Quick diagnostic**: Run `window.__chartDebug.getInfo()` in console

---

## 🔧 For Developers: Next Steps

To fully fix this issue (get real historical data), you need to:

### Option 1: TradeLocker Historical API (Best, if available)
1. Check if TradeLocker has `/instruments/{id}/candles` endpoint
2. Implement `getHistoricalCandles()` in `server/tradelocker.ts`
3. Fetch real data on chart load instead of generating

### Option 2: Database Storage (Most reliable)
1. Create `candles` table in database
2. Save each closed candle to DB
3. Load recent candles from DB on chart init
4. Build up real history over time

### Option 3: Third-Party Provider (Hybrid)
1. Use Polygon.io, Alpha Vantage, or similar
2. Fetch historical from them, live from TradeLocker
3. Merge both data sources in chart

**See `CHART_FIX_SUMMARY.md` for detailed implementation guides.**

---

## 🆘 Getting Help

If you see unexpected behavior:

1. **Run diagnostic:**
   ```javascript
   (async () => {
     console.group('📊 Full Diagnostic');
     window.__chartDebug.getInfo();
     const status = await fetch('/api/broker/status').then(r => r.json());
     console.log('Broker Status:', status);
     const quotes = await fetch(`/api/broker/quotes?symbols=XAUUSD`).then(r => r.json());
     console.log('Current Quotes:', quotes);
     console.groupEnd();
   })();
   ```

2. **Copy console output**

3. **Take screenshot** of chart with badges visible

4. **Report issue** with:
   - Console logs
   - Screenshot
   - What you expected vs what you got
   - Symbol and timeframe being viewed

---

*Last updated: December 13, 2025*
