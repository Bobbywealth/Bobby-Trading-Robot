# TradingView Integration Guide

## Overview

You can now use **TradingView's charts** instead of building your own chart data infrastructure. This solves the "simulated historical candles" problem by leveraging TradingView's professional data feeds.

---

## ✅ What's Implemented (Free Solution)

### TradingView Widget Toggle

A **free TradingView widget** is now integrated as an alternative chart view. Click the maximize button (📊) in the chart header to toggle between:

- **Custom Chart** (lightweight-charts + TradeLocker data)
- **TradingView Widget** (embedded TradingView chart with real data)

**Features:**
- ✅ Real historical data from TradingView
- ✅ Professional charting interface
- ✅ 100% free (no license required)
- ✅ Toggle on/off with one click
- ✅ Respects your selected symbol and timeframe

**Limitations:**
- ⚠️ Cannot place orders from chart (TradingView widget only)
- ⚠️ Shows TradingView branding
- ⚠️ Cannot customize indicators/drawings programmatically
- ⚠️ Embedded iframe (not fully integrated)

---

## 🚀 How to Use

### Using the Free TradingView Widget

1. **Open your dashboard** (`/robot` or `/`)
2. **Look at the chart header** - find the maximize button (📊)
3. **Click the maximize button** to toggle TradingView widget on/off
4. **When active:**
   - Badge shows "TradingView Data"
   - Full TradingView chart loads with real data
   - Symbol and timeframe sync automatically
5. **Trading:** Use the "Quick Trade" panel on the right (TradeLocker integration)

### Symbol Mapping

The widget automatically maps your broker symbols to TradingView symbols:

| Your Symbol | TradingView Symbol | Asset Type |
|-------------|-------------------|------------|
| XAUUSD | TVC:GOLD | Gold Futures |
| EURUSD | FX:EURUSD | Forex |
| GBPUSD | FX:GBPUSD | Forex |
| USDJPY | FX:USDJPY | Forex |
| (others) | FX:{symbol} | Forex (default) |

---

## 💰 Professional Integration (Advanced Charts)

For a production trading platform, consider TradingView's **Advanced Charts** library with Broker API integration.

### What You Get

- ✅ Full programmatic control
- ✅ Broker API integration (place orders from chart)
- ✅ Custom branding
- ✅ Advanced indicators and studies
- ✅ Multi-chart layouts
- ✅ Paper trading mode
- ✅ Order panel, watchlists, account manager
- ✅ Mobile responsive

### Pricing

- **Starter:** ~$500/year
- **Professional:** ~$1,500/year
- **Enterprise:** ~$3,000+/year

[Contact TradingView Sales](https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/)

### Implementation Steps

Based on [TradingView's Broker API Tutorial](https://www.tradingview.com/charting-library-docs/latest/tutorials/implement-broker-api/):

#### 1. Purchase License & Get Access

1. Contact TradingView sales
2. Sign license agreement
3. Get access to npm package or GitHub repo

#### 2. Install Library

```bash
npm install @tradingview/charting-library
# or use their GitHub repo with credentials
```

#### 3. Implement Broker API

Create `client/src/lib/tradingview-broker.ts`:

```typescript
import {
  IBrokerTerminal,
  ConnectionStatus,
  Order,
  Position,
  InstrumentInfo,
  AccountManagerInfo,
  // ... other types
} from '@tradingview/charting-library';

export class TradeLockerBrokerAdapter implements IBrokerTerminal {
  private tradeLockerApi: typeof import('./api');

  constructor() {
    this.tradeLockerApi = require('./api');
  }

  // Connection status
  connectionStatus(): ConnectionStatus {
    // Check if connected to TradeLocker
    return ConnectionStatus.Connected;
  }

  // Symbol info (for Buy/Sell buttons)
  async symbolInfo(symbol: string): Promise<InstrumentInfo> {
    const instruments = await this.tradeLockerApi.useBrokerInstruments();
    const instrument = instruments.find(i => i.name === symbol);
    
    return {
      symbol: symbol,
      description: instrument?.description || symbol,
      type: 'forex', // or 'cfd', 'futures', etc.
      pipSize: 0.01,
      // ... other instrument details
    };
  }

  // Make symbol tradable (enables Buy/Sell buttons)
  async isTradable(symbol: string): Promise<boolean> {
    const instruments = await this.tradeLockerApi.useBrokerInstruments();
    return instruments.some(i => i.name === symbol);
  }

  // Load orders
  async orders(): Promise<Order[]> {
    const positions = await this.tradeLockerApi.useBrokerPositions();
    return positions.map(p => ({
      id: p.id,
      symbol: p.symbol,
      type: p.side === 'buy' ? OrderType.Buy : OrderType.Sell,
      qty: p.qty,
      // ... other order fields
    }));
  }

  // Load positions
  async positions(): Promise<Position[]> {
    const positions = await this.tradeLockerApi.useBrokerPositions();
    return positions.map(p => ({
      id: p.id,
      symbol: p.symbol,
      qty: p.qty,
      // ... other position fields
    }));
  }

  // Place order
  async placeOrder(order: PreOrder): Promise<PlaceOrderResult> {
    const result = await this.tradeLockerApi.usePlaceOrder({
      instrumentId: order.instrumentId,
      qty: order.qty,
      side: order.type === OrderType.Buy ? 'buy' : 'sell',
      type: 'market', // or 'limit', 'stop'
    });

    return {
      orderId: result.orderId,
    };
  }

  // Cancel order
  async cancelOrder(orderId: string): Promise<void> {
    // Implement cancel order via TradeLocker API
  }

  // Account manager info
  accountManagerInfo(): AccountManagerInfo {
    return {
      accountTitle: 'TradeLocker',
      summary: [
        { text: 'Balance', wValue: 'balance' },
        { text: 'Equity', wValue: 'equity' },
        // ... other fields
      ],
      // ... other account manager config
    };
  }

  // ... implement other required methods
}
```

#### 4. Initialize TradingView Widget

Update `client/src/components/trading/MarketChart.tsx`:

```typescript
import { widget } from '@tradingview/charting-library';
import { TradeLockerBrokerAdapter } from '@/lib/tradingview-broker';

export function MarketChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const tvWidget = new widget({
      container: chartContainerRef.current,
      library_path: '/charting_library/',
      locale: 'en',
      symbol: 'FX:EURUSD',
      interval: '1H',
      timezone: 'Etc/UTC',
      theme: 'dark',
      autosize: true,
      
      // Enable trading
      broker_factory: (host, datafeed) => {
        return new TradeLockerBrokerAdapter();
      },
      
      // Datafeed for price data (can use TradingView's default)
      datafeed: new Datafeeds.UDFCompatibleDatafeed(
        'https://demo-feed-data.tradingview.com'
      ),
    });

    return () => tvWidget.remove();
  }, []);

  return <div ref={chartContainerRef} className="h-full w-full" />;
}
```

#### 5. Test Broker Integration

1. Check Buy/Sell buttons appear on chart
2. Click Buy → Order Ticket opens
3. Submit order → Shows in Account Manager
4. Check positions/orders sync with TradeLocker

---

## 🎯 Recommendation

### For Now (Development/Testing)
Use the **free TradingView widget toggle** I just implemented:
- ✅ Get real chart data immediately
- ✅ No cost
- ✅ Easy to try out
- ✅ Keep TradeLocker for trading

### For Production
Invest in **TradingView Advanced Charts**:
- ✅ Professional experience
- ✅ Fully integrated trading
- ✅ Custom branding
- ✅ Worth it for serious trading platform

---

## Symbol Mapping Configuration

If you need to customize symbol mapping for the widget, edit `MarketChart.tsx`:

```typescript
const getTradingViewSymbol = (brokerSymbol: string): string => {
  const mapping: Record<string, string> = {
    'XAUUSD': 'TVC:GOLD',
    'XAGUSD': 'TVC:SILVER',
    'BTCUSD': 'BITSTAMP:BTCUSD',
    'ETHUSD': 'BITSTAMP:ETHUSD',
    'US30': 'DJ:DJI',
    'SPX500': 'SP:SPX',
    'NAS100': 'NASDAQ:NDX',
    // Add more custom mappings as needed
  };

  return mapping[brokerSymbol] || `FX:${brokerSymbol}`;
};
```

---

## Troubleshooting

### Widget not loading
- Check browser console for errors
- Ensure you have internet connection
- TradingView widget requires external access

### Symbol not found
- Check symbol mapping in code
- TradingView uses different symbol formats
- Try searching symbol on TradingView.com first

### Timeframe mismatch
- Widget timeframes: 1, 5, 15, 60, 240 (minutes)
- Your timeframes: 1m, 5m, 15m, 1h, 4h
- Mapping is handled automatically

---

## API References

- [TradingView Advanced Charts Docs](https://www.tradingview.com/charting-library-docs/latest/)
- [Broker API Tutorial](https://www.tradingview.com/charting-library-docs/latest/tutorials/implement-broker-api/)
- [TradingView Widget (Free)](https://www.tradingview.com/widget/)

---

## Comparison: Custom vs TradingView

| Feature | Custom (Lightweight Charts) | TradingView Widget (Free) | TradingView Advanced (Paid) |
|---------|----------------------------|---------------------------|----------------------------|
| **Historical Data** | From TradeLocker (or simulated) | Real from TradingView | Real from TradingView |
| **Live Data** | TradeLocker quotes | TradingView feed | TradingView + broker |
| **Trading** | Via separate panels | Via separate panels | Integrated (chart orders) |
| **Customization** | Full control | Limited (iframe) | Full control |
| **Indicators** | Custom (EMA example) | All TradingView indicators | All + custom |
| **Branding** | Your branding | TradingView branding | Your branding |
| **Cost** | Free | Free | $500-3000/year |
| **Best for** | Custom UX, learning | Quick solution | Professional platform |

---

## Next Steps

### Option 1: Keep Current Toggle (Recommended for now)
- ✅ Already implemented
- ✅ Try out TradingView widget
- ✅ Keep TradeLocker integration
- ✅ Decide later if you want to upgrade

### Option 2: Commit to TradingView Advanced
1. Contact TradingView sales
2. Purchase license
3. Implement Broker API (1-2 weeks)
4. Replace custom chart entirely
5. Professional trading experience

### Option 3: Hybrid Approach
- Keep custom chart for quick trades
- Add TradingView Advanced for analysis
- Let users choose their preference

---

*Last updated: December 13, 2025*
