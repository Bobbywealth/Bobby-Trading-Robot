/**
 * MarketChart Component
 * 
 * ⚠️ IMPORTANT DATA SOURCE LIMITATION:
 * This chart displays SIMULATED historical candles (all but the latest candle are fake).
 * Only new candles created from live broker feeds are real.
 * 
 * For debugging price discrepancies, see: /CHART_DATA_DEBUGGING.md
 * 
 * Console logging is enabled to help developers identify data source issues.
 * Look for [MarketChart] logs in browser console for detailed feed information.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickSeries,
  LineSeries,
  IPriceLine,
} from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Maximize2, Wifi, WifiOff, TrendingUp, PlugZap } from "lucide-react";
import { useBrokerStatus, useBrokerQuotes, useBrokerInstruments, useBrokerCandles } from "@/lib/api";

const TIMEFRAMES = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
} as const;

type TimeframeKey = keyof typeof TIMEFRAMES;

type Candle = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
};

/**
 * ⚠️ TEMPORARY SOLUTION: Generate simulated candlestick data
 * 
 * This generates FAKE historical data with random price movements.
 * It's used because:
 * 1. TradeLocker may not provide a historical OHLC candles API
 * 2. We need to display something while waiting for real candles to accumulate
 * 
 * TODO: Replace with real historical data by:
 * - Checking if TradeLocker has a candles/bars API endpoint
 * - Implementing a backend route to fetch historical candles
 * - Storing live candles in the database to build history over time
 * - Consider using a third-party data provider (e.g., polygon.io, alphavantage)
 * 
 * Current behavior:
 * - Seeds with live price if available, otherwise uses default (2035)
 * - Generates 200 fake candles going backwards in time
 * - Only new candles created from live quotes are real
 */
const generateData = (count: number, intervalMs: number, startPrice = 2035): Candle[] => {
  let price = startPrice;
  const data: Candle[] = [];
  const time = Math.floor(new Date("2023-01-01").getTime() / 1000);

  for (let i = 0; i < count; i++) {
    const volatility = 2.5;
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    price = close;

    data.push({
      time: (time + Math.floor((i * intervalMs) / 1000)) as Time,
      open,
      high,
      low,
      close,
    });
  }
  return data;
};

// Calculate EMA
const calculateEMA = (data: Candle[], period: number) => {
  const k = 2 / (period + 1);
  let ema = data[0].close;
  return data.map((d) => {
    ema = d.close * k + ema * (1 - k);
    return { time: d.time, value: ema };
  });
};

// Calculate Support and Resistance Levels
const calculateSupportResistance = (data: Candle[], lookback: number = 10) => {
  const levels: { price: number; type: "support" | "resistance"; strength: number }[] = [];

  // Find swing highs and lows
  for (let i = lookback; i < data.length - lookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isSwingHigh = false;
      }
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      levels.push({ price: data[i].high, type: "resistance", strength: 1 });
    }
    if (isSwingLow) {
      levels.push({ price: data[i].low, type: "support", strength: 1 });
    }
  }

  // Cluster nearby levels and increase strength
  const tolerance = (Math.max(...data.map((d) => d.high)) - Math.min(...data.map((d) => d.low))) * 0.01;
  const clusteredLevels: { price: number; type: "support" | "resistance"; strength: number }[] = [];

  levels.forEach((level) => {
    const existingLevel = clusteredLevels.find(
      (l) => Math.abs(l.price - level.price) < tolerance && l.type === level.type
    );

    if (existingLevel) {
      existingLevel.strength++;
      existingLevel.price = (existingLevel.price + level.price) / 2;
    } else {
      clusteredLevels.push({ ...level });
    }
  });

  // Sort by strength and return top levels
  return clusteredLevels.sort((a, b) => b.strength - a.strength).slice(0, 6);
};

export function MarketChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [showStrategy, setShowStrategy] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [candleSeries, setCandleSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
  const [fastEmaSeries, setFastEmaSeries] = useState<ISeriesApi<"Line"> | null>(null);
  const [slowEmaSeries, setSlowEmaSeries] = useState<ISeriesApi<"Line"> | null>(null);
  const [srLevels, setSrLevels] = useState<{ price: number; type: "support" | "resistance"; strength: number }[]>([]);
  const [chartReady, setChartReady] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1h");
  const candleDataRef = useRef<Candle[]>([]);
  const levelLinesRef = useRef<IPriceLine[]>([]);
  const [isHistoricalDataSimulated, setIsHistoricalDataSimulated] = useState(true);
  const [liveCandleCount, setLiveCandleCount] = useState(0);

  const { data: brokerStatus, isLoading: isStatusLoading } = useBrokerStatus();
  const isConnected = brokerStatus?.connected && brokerStatus?.accountNumber;

  const { data: instruments = [] } = useBrokerInstruments(Boolean(isConnected));
  const safeInstruments = useMemo(
    () => (Array.isArray(instruments) ? instruments : []) as Array<{ tradableInstrumentId: number; name: string }>,
    [instruments],
  );

  const [symbol, setSymbol] = useState<string>("XAUUSD");

  useEffect(() => {
    if (safeInstruments.length > 0) {
      setSymbol((prev) => prev || safeInstruments[0].name);
    }
  }, [safeInstruments]);

  const {
    data: liveQuotes,
    isLoading: quotesLoading,
    error: quotesError,
    isError: isQuotesError,
    refetch: refetchQuotes,
  } = useBrokerQuotes(isConnected && symbol ? [symbol] : []);
  const livePrice = liveQuotes?.[0];

  // Fetch historical candles from broker
  const {
    data: historicalCandles,
    isLoading: candlesLoading,
    error: candlesError,
  } = useBrokerCandles(
    symbol,
    timeframe,
    200,
    Boolean(isConnected && symbol)
  );

  // Initialize chart shell and series
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.5)" },
        horzLines: { color: "rgba(30, 41, 59, 0.5)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(30, 41, 59, 0.8)" },
      timeScale: {
        borderColor: "rgba(30, 41, 59, 0.8)",
        timeVisible: true,
      },
      autoSize: true,
    });

    chartRef.current = chart;

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    setCandleSeries(candles);

    const fastEma = chart.addSeries(LineSeries, {
      color: "#22d3ee",
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    setFastEmaSeries(fastEma);

    const slowEma = chart.addSeries(LineSeries, {
      color: "#c084fc",
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    setSlowEmaSeries(slowEma);

    return () => {
      candles && levelLinesRef.current.forEach((line) => candles.removePriceLine(line));
      chart.remove();
    };
  }, []);

  // Seed chart data when series are ready or timeframe changes
  useEffect(() => {
    if (!candleSeries || !fastEmaSeries || !slowEmaSeries) return;

    const intervalMs = TIMEFRAMES[timeframe];
    const initialPrice = livePrice?.ask ?? livePrice?.bid ?? 2035;
    
    let initialData: Candle[];
    let isRealData = false;

    // Try to use real historical candles from broker first
    if (historicalCandles && historicalCandles.length > 0) {
      console.log(`[MarketChart] ✅ Using ${historicalCandles.length} REAL historical candles from TradeLocker`);
      initialData = historicalCandles.map(c => ({
        time: (c.time / 1000) as Time, // Convert ms to seconds
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      isRealData = true;
      setIsHistoricalDataSimulated(false);
    } else {
      // Fallback to simulated data if broker doesn't provide candles
      console.warn(`[MarketChart] ⚠️  TradeLocker historical candles API not available`);
      console.log(`[MarketChart] Falling back to SIMULATED historical candles`);
      
      if (livePrice) {
        console.log(`[MarketChart] Seeding simulated data with LIVE price:`, {
          symbol,
          timeframe,
          brokerBid: livePrice.bid,
          brokerAsk: livePrice.ask,
          brokerMid: ((livePrice.bid + livePrice.ask) / 2).toFixed(2),
          timestamp: new Date(livePrice.timestamp).toISOString(),
          source: (livePrice as any).source || 'tradelocker'
        });
      } else {
        console.warn(`[MarketChart] No live price available - using default seed (${initialPrice})`);
      }
      
      initialData = generateData(200, intervalMs, initialPrice);
      setIsHistoricalDataSimulated(true);
    }
    
    candleDataRef.current = initialData;
    candleSeries.setData(initialData);
    setLiveCandleCount(0);

    const fastEmaData = calculateEMA(initialData, 9);
    const slowEmaData = calculateEMA(initialData, 21);
    fastEmaSeries.setData(fastEmaData);
    slowEmaSeries.setData(slowEmaData);

    const markers = [] as any[];
    for (let i = 20; i < initialData.length; i++) {
      const prevFast = fastEmaData[i - 1].value;
      const prevSlow = slowEmaData[i - 1].value;
      const currFast = fastEmaData[i].value;
      const currSlow = slowEmaData[i].value;

      if (prevFast <= prevSlow && currFast > currSlow) {
        markers.push({
          time: initialData[i].time,
          position: "belowBar",
          color: "#22c55e",
          shape: "arrowUp",
          text: "BUY",
          size: 2,
        });
      } else if (prevFast >= prevSlow && currFast < currSlow) {
        markers.push({
          time: initialData[i].time,
          position: "aboveBar",
          color: "#ef4444",
          shape: "arrowDown",
          text: "SELL",
          size: 2,
        });
      }
    }

    try {
      if (markers.length > 0) {
        (candleSeries as any).setMarkers?.(markers);
      }
    } catch {
      // Markers not supported
    }

    const levels = calculateSupportResistance(initialData, 8);
    setSrLevels(levels);

    levelLinesRef.current.forEach((line) => candleSeries.removePriceLine(line));
    levelLinesRef.current = showLevels
      ? levels.map((level, index) =>
          candleSeries.createPriceLine({
            price: level.price,
            color: level.type === "resistance" ? "#ef4444" : "#22c55e",
            lineWidth: level.strength > 2 ? 2 : 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: level.type === "resistance" ? `R${index + 1}` : `S${index + 1}`,
          })
        )
      : [];

    setChartReady(true);
  }, [timeframe, symbol, candleSeries, fastEmaSeries, slowEmaSeries, showLevels, livePrice, historicalCandles]);

  // Toggle Strategy Visibility
  useEffect(() => {
    if (fastEmaSeries && slowEmaSeries) {
      fastEmaSeries.applyOptions({ visible: showStrategy });
      slowEmaSeries.applyOptions({ visible: showStrategy });
    }
  }, [showStrategy, fastEmaSeries, slowEmaSeries]);

  // Manage level visibility toggling
  useEffect(() => {
    if (!candleSeries) return;

    levelLinesRef.current.forEach((line) => candleSeries.removePriceLine(line));
    levelLinesRef.current = showLevels
      ? srLevels.map((level, index) =>
          candleSeries.createPriceLine({
            price: level.price,
            color: level.type === "resistance" ? "#ef4444" : "#22c55e",
            lineWidth: level.strength > 2 ? 2 : 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: level.type === "resistance" ? `R${index + 1}` : `S${index + 1}`,
          })
        )
      : [];
  }, [showLevels, srLevels, candleSeries]);

  // Stream live quotes into the chart when connected
  useEffect(() => {
    if (!isConnected || !livePrice || !candleSeries) return;

    const midPrice = (livePrice.bid + livePrice.ask) / 2;
    const intervalMs = TIMEFRAMES[timeframe];
    const quoteTime = livePrice.timestamp ?? Date.now();
    const bucketTime = Math.floor(quoteTime / intervalMs) * intervalMs;
    const candleTime = (bucketTime / 1000) as Time;

    const data = candleDataRef.current;
    const last = data[data.length - 1];
    
    // Log live feed updates for debugging
    const isNewCandle = !last || last.time !== candleTime;
    console.log(`[MarketChart] Live quote update:`, {
      symbol,
      brokerBid: livePrice.bid.toFixed(2),
      brokerAsk: livePrice.ask.toFixed(2),
      brokerMid: midPrice.toFixed(2),
      chartDisplayPrice: last?.close.toFixed(2) || 'N/A',
      priceDiff: last ? (midPrice - last.close).toFixed(2) : 'N/A',
      isNewCandle,
      timestamp: new Date(quoteTime).toISOString(),
      source: (livePrice as any).source || 'tradelocker',
      reason: (livePrice as any).reason,
    });

    if (last && last.time === candleTime) {
      const updatedBar = {
        ...last,
        high: Math.max(last.high, midPrice),
        low: Math.min(last.low, midPrice),
        close: midPrice,
      } as Candle;

      const changed =
        updatedBar.close !== last.close ||
        updatedBar.high !== last.high ||
        updatedBar.low !== last.low;

      if (!changed) return;

      data[data.length - 1] = updatedBar;
      candleSeries.update(updatedBar);
    } else {
      const newBar: Candle = {
        time: candleTime,
        open: midPrice,
        high: midPrice,
        low: midPrice,
        close: midPrice,
      };
      data.push(newBar);
      candleSeries.update(newBar);
      
      // Track live candles
      setLiveCandleCount(prev => prev + 1);
      console.log(`[MarketChart] ✅ New LIVE candle created from broker feed (total live: ${liveCandleCount + 1})`);
    }

    const fastEmaData = calculateEMA(data, 9);
    const slowEmaData = calculateEMA(data, 21);
    fastEmaSeries?.setData(fastEmaData);
    slowEmaSeries?.setData(slowEmaData);

    if (showLevels) {
      const levels = calculateSupportResistance(data, 8);
      setSrLevels(levels);
      levelLinesRef.current.forEach((line) => candleSeries.removePriceLine(line));
      levelLinesRef.current = levels.map((level, index) =>
        candleSeries.createPriceLine({
          price: level.price,
          color: level.type === "resistance" ? "#ef4444" : "#22c55e",
          lineWidth: level.strength > 2 ? 2 : 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: level.type === "resistance" ? `R${index + 1}` : `S${index + 1}`,
        })
      );
    }
  }, [livePrice, isConnected, timeframe, candleSeries, fastEmaSeries, slowEmaSeries, showLevels]);

  const displayPrice = livePrice ? ((livePrice.bid + livePrice.ask) / 2).toFixed(2) : "2,042.58";

  // Expose debug info to window for console debugging
  useEffect(() => {
    (window as any).__chartDebug = {
      symbol,
      timeframe,
      isConnected,
      livePrice,
      totalCandles: candleDataRef.current.length,
      liveCandleCount,
      isHistoricalDataSimulated,
      lastCandle: candleDataRef.current[candleDataRef.current.length - 1],
      getInfo: () => {
        const last = candleDataRef.current[candleDataRef.current.length - 1];
        console.group('🔍 Chart Debug Info');
        console.log('Symbol:', symbol);
        console.log('Timeframe:', timeframe);
        console.log('Connected:', isConnected);
        console.log('Live Price:', livePrice);
        console.log('Total Candles:', candleDataRef.current.length);
        console.log('Real Candles:', liveCandleCount);
        console.log('Fake Candles:', candleDataRef.current.length - liveCandleCount);
        console.log('Historical Data:', isHistoricalDataSimulated ? '⚠️ SIMULATED' : '✅ REAL');
        console.log('Last Candle:', last);
        if (livePrice && last) {
          const brokerMid = (livePrice.bid + livePrice.ask) / 2;
          const diff = Math.abs(brokerMid - last.close);
          console.log('Price Difference:', diff.toFixed(2), diff > 1 ? '⚠️ LARGE' : '✅ OK');
        }
        console.groupEnd();
      }
    };
  }, [symbol, timeframe, isConnected, livePrice, liveCandleCount, isHistoricalDataSimulated]);

  return (
    <Card className="h-full border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0 border-b border-border/20 bg-card/50">
        <div className="space-y-1">
          <CardTitle className="font-display text-lg flex items-center gap-2 flex-wrap">
            {symbol} <span className="text-muted-foreground font-sans text-sm font-normal">Live price</span>
            {isConnected ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs ml-2">
                <Wifi className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-muted text-xs ml-2">
                <WifiOff className="w-3 h-3 mr-1" />
                DEMO
              </Badge>
            )}
            {candlesLoading && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                Loading historical...
              </Badge>
            )}
            {!candlesLoading && isHistoricalDataSimulated && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">
                Historical: Simulated
              </Badge>
            )}
            {!candlesLoading && !isHistoricalDataSimulated && historicalCandles && historicalCandles.length > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                Historical: Real ({historicalCandles.length} candles)
              </Badge>
            )}
            {isConnected && liveCandleCount > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                {liveCandleCount} Live {liveCandleCount === 1 ? 'Candle' : 'Candles'}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-foreground" data-testid="text-price">
                {displayPrice}
              </span>
              {livePrice && (
                <div className="flex gap-1 text-xs font-mono">
                  <span className="text-muted-foreground">B:</span>
                  <span className="text-primary">{livePrice.bid.toFixed(2)}</span>
                  <span className="text-muted-foreground ml-1">A:</span>
                  <span className="text-destructive">{livePrice.ask.toFixed(2)}</span>
                  {(livePrice as any).source === 'mock' && (
                    <span className="ml-2 text-yellow-500 text-xs" title={(livePrice as any).reason}>
                      ⚠️ Mock
                    </span>
                  )}
                </div>
              )}
            </div>
            {showStrategy && (
              <div className="flex items-center gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-1.5 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-cyan-400 font-mono">EMA 9</span>
                </div>
                <div className="flex items-center gap-1.5 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-purple-400 font-mono">EMA 21</span>
                </div>
              </div>
            )}
            {showLevels && srLevels.length > 0 && (
              <div className="flex items-center gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                  <div className="w-2 h-0.5 bg-red-400" />
                  <span className="text-red-400 font-mono">Resistance</span>
                </div>
                <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                  <div className="w-2 h-0.5 bg-green-400" />
                  <span className="text-green-400 font-mono">Support</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={symbol} onValueChange={setSymbol} disabled={!isConnected || safeInstruments.length === 0}>
            <SelectTrigger className="w-[140px] h-8 bg-background/50 border-border/50">
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
            <SelectContent>
              {safeInstruments.map((inst) => (
                <SelectItem key={inst.tradableInstrumentId} value={inst.name}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-background/50 border-border/50"
            onClick={() => setShowStrategy(!showStrategy)}
            title="Toggle Strategy"
            data-testid="button-toggle-strategy"
          >
            {showStrategy ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`h-8 w-8 bg-background/50 border-border/50 ${showLevels ? "text-primary border-primary/50" : ""}`}
            onClick={() => setShowLevels(!showLevels)}
            title="Toggle Support/Resistance Levels"
            data-testid="button-toggle-levels"
          >
            <TrendingUp className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-background/50 border-border/50">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as TimeframeKey)}>
            <SelectTrigger className="w-[80px] h-8 bg-background/50 border-border/50">
              <SelectValue placeholder="TF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">M1</SelectItem>
              <SelectItem value="5m">M5</SelectItem>
              <SelectItem value="15m">M15</SelectItem>
              <SelectItem value="1h">H1</SelectItem>
              <SelectItem value="4h">H4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 relative">
        {!chartReady && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-mono">
            Initializing chart...
          </div>
        )}

        {!isStatusLoading && !isConnected && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm border border-dashed border-border/50 m-3 rounded-lg">
            <PlugZap className="w-6 h-6 text-primary" />
            <div className="text-center space-y-1">
              <p className="font-semibold">Live feed disabled</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Connect your broker account to stream real-time prices and orders.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/connect">Connect broker</Link>
            </Button>
          </div>
        )}

        {isConnected && quotesLoading && (
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <Badge variant="outline" className="bg-muted/40 text-xs">Syncing live quotes…</Badge>
          </div>
        )}

        {isConnected && !candlesLoading && isHistoricalDataSimulated && liveCandleCount < 10 && (
          <div className="absolute inset-x-0 top-2 flex justify-center px-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded text-xs font-mono max-w-2xl backdrop-blur-sm">
              ⚠️ Historical candles are SIMULATED (TradeLocker API unavailable). Only new candles use real broker data. {liveCandleCount > 0 && `(${liveCandleCount} live so far)`}
            </div>
          </div>
        )}

        {isConnected && !candlesLoading && !isHistoricalDataSimulated && historicalCandles && historicalCandles.length > 0 && (
          <div className="absolute inset-x-0 top-2 flex justify-center px-4">
            <div className="bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 px-3 py-1.5 rounded text-xs font-mono max-w-2xl backdrop-blur-sm">
              ✅ Using {historicalCandles.length} real historical candles from TradeLocker
            </div>
          </div>
        )}

        {isConnected && isQuotesError && (
          (() => {
            const msg = (quotesError as Error)?.message ?? "Failed to fetch quotes from broker.";
            const needsReconnect = msg.includes("401") || msg.toLowerCase().includes("expired");
            return (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm border border-dashed border-destructive/40 m-3 rounded-lg text-center px-4">
            <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10">Live quotes unavailable</Badge>
            <p className="text-sm text-muted-foreground font-mono break-words">
              {msg}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => refetchQuotes()}>
                Retry feed
              </Button>
              {needsReconnect && (
                <Button asChild size="sm">
                  <Link href="/connect">Reconnect broker</Link>
                </Button>
              )}
            </div>
          </div>
            );
          })()
        )}

        <div ref={chartContainerRef} className="absolute inset-0" />
      </CardContent>
    </Card>
  );
}
