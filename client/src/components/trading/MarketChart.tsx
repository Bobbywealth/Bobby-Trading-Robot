/**
 * MarketChart Component
 * Displays live market chart using ForexRateAPI for real-time quotes and historical candles
 * Documentation: https://forexrateapi.com/documentation
 */

import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, TrendingUp, TrendingDown } from "lucide-react";
import { useForexRateQuotes, useForexRateCandles } from "@/lib/api";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";

const TIMEFRAMES = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
} as const;

type TimeframeKey = keyof typeof TIMEFRAMES;

export function MarketChart() {
  const [symbol, setSymbol] = useState<string>("XAUUSD");
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1h");
  const [showLevels, setShowLevels] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  
  const { data: quotes, isLoading: quotesLoading } = useForexRateQuotes([symbol]);
  const { data: candles, isLoading: candlesLoading } = useForexRateCandles(symbol, timeframe);

  const livePrice = quotes?.[0];
  const displayPrice = livePrice ? ((livePrice.bid + livePrice.ask) / 2).toFixed(2) : "2,042.58";

  // Calculate EMAs
  const fastEma = useMemo(() => {
    if (!candles || candles.length < 9) return null;
    const closePrices = candles.map(c => c.close);
    return calculateEMA(closePrices, 9);
  }, [candles]);

  const slowEma = useMemo(() => {
    if (!candles || candles.length < 21) return null;
    const closePrices = candles.map(c => c.close);
    return calculateEMA(closePrices, 21);
  }, [candles]);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current || !candles || candles.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.5)" },
        horzLines: { color: "rgba(30, 41, 59, 0.5)" },
      },
      timeScale: {
        borderColor: "rgba(30, 41, 59, 0.8)",
        timeVisible: true,
      },
      autoSize: true,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "rgba(30, 41, 59, 0.8)",
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addSeries({
      name: 'Candles',
      type: 'Candlestick',
      data: candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // Create EMA series
    const fastEmaSeries = chart.addSeries({
      name: 'Fast EMA (9)',
      type: 'Line',
      data: fastEma.map((v) => ({ time: v.time, value: v.value })),
      color: "#22d3ee",
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const slowEmaSeries = chart.addSeries({
      name: 'Slow EMA (21)',
      type: 'Line',
      data: slowEma.map((v) => ({ time: v.time, value: v.value })),
      color: "#c084fc",
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    setChartReady(true);
  }, [symbol, timeframe, quotes, candles, chartReady, showLevels, fastEma, slowEma, livePrice, displayPrice]);

  return (
    <Card className="border-border/50 hover:border-primary/50 transition-colors">
      <CardHeader className="flex items-center justify-between pb-4">
        <CardTitle>
          Market Chart <span className="text-muted-foreground font-normal text-sm">{symbol}</span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Badge variant={quotesLoading ? "outline" : "secondary"}>
            {quotesLoading ? "Loading..." : "Live"}
          </Badge>
          {candlesLoading && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
              Loading...
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Symbol and Timeframe Selection */}
        <div className="flex gap-4">
          <Select value={symbol} onValueChange={setSymbol} disabled={quotesLoading || candlesLoading}>
            <SelectTrigger className="w-[140px] h-8 bg-background/50 border-border/50">
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe} disabled={quotesLoading || candlesLoading}>
            <SelectTrigger className="w-[140px] h-8 bg-background/50 border-border/50">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
          </Select>
        </div>

        {/* Live Price Display */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">Live Price</div>
          <div className="text-2xl font-mono font-bold text-foreground">
            {displayPrice}
          </div>
          {livePrice && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
              Live
            </Badge>
          )}
        </div>

        {/* EMAs */}
        {chartReady && (
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${(fastEma && fastEma.length > 0 && slowEma && slowEma.length > 0 && fastEma[fastEma.length - 1]?.value > slowEma[slowEma.length - 1]?.value) ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <span className="text-xs font-mono">Fast EMA (9)</span>
              </div>
              <div className={`w-3 h-3 rounded-full ${(fastEma && fastEma.length > 0 && slowEma && slowEma.length > 0 && slowEma[slowEma.length - 1]?.value > fastEma[fastEma.length - 1]?.value) ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <span className="text-xs font-mono">Slow EMA (21)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowLevels(!showLevels)}
                title="Toggle EMAs"
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (chartRef.current) {
                    const chart = chartRef.current;
                    const series = chart.getSeries();
                    series.forEach((s: any) => {
                      if (s.options().name?.includes('EMA')) {
                        s.applyOptions({ visible: !showLevels });
                      }
                    });
                  }
                }}
                title={showLevels ? "Hide EMAs" : "Show EMAs"}
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Chart Container */}
        <div ref={chartContainerRef} className="h-[500px] w-full" />
      </CardContent>
    </Card>
  );
}

// Helper function to calculate EMA
function calculateEMA(data: { time: number; value: number }[], period: number): { time: number; value: number }[] {
  const k = 2 / (period + 1);
  
  return data.map((d, i) => {
    if (i === 0) {
      return { time: d.time, value: d.value };
    }
    
    const prevEma = i > 0 ? data[i - 1].value : d.value;
    const ema = (d.value * k) + (prevEma * (1 - k));
    
    return { time: d.time, value: ema };
  });
}
