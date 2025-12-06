import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, Time, CandlestickSeries, LineSeries } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Maximize2, Wifi, WifiOff } from "lucide-react";
import { useBrokerStatus, useBrokerQuotes } from "@/lib/api";

// Generate realistic candlestick data
const generateData = (count: number) => {
  let price = 2035.00;
  const data = [];
  const time = new Date("2023-01-01").getTime() / 1000;
  
  for (let i = 0; i < count; i++) {
    const volatility = 2.5;
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    
    price = close;

    data.push({
      time: (time + i * 3600) as Time, // Hourly bars
      open,
      high,
      low,
      close,
    });
  }
  return data;
};

// Calculate EMA
const calculateEMA = (data: any[], period: number) => {
  const k = 2 / (period + 1);
  let ema = data[0].close;
  return data.map(d => {
    ema = d.close * k + ema * (1 - k);
    return { time: d.time, value: ema };
  });
};

export function MarketChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [showStrategy, setShowStrategy] = useState(true);
  const [candleSeries, setCandleSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
  const [fastEmaSeries, setFastEmaSeries] = useState<ISeriesApi<"Line"> | null>(null);
  const [slowEmaSeries, setSlowEmaSeries] = useState<ISeriesApi<"Line"> | null>(null);
  
  const { data: brokerStatus } = useBrokerStatus();
  const isConnected = brokerStatus?.connected && brokerStatus?.accountNumber;
  
  const { data: liveQuotes } = useBrokerQuotes(isConnected ? ["XAUUSD"] : []);
  const livePrice = liveQuotes?.[0];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Create Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(30, 41, 59, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(30, 41, 59, 0.8)',
        timeVisible: true,
      },
      autoSize: true,
    });

    chartRef.current = chart;

    // 2. Add Candlestick Series
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    setCandleSeries(candles);

    // 3. Add Strategy Lines (EMAs)
    const fastEma = chart.addSeries(LineSeries, {
      color: '#22d3ee', // Cyan
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    setFastEmaSeries(fastEma);

    const slowEma = chart.addSeries(LineSeries, {
      color: '#c084fc', // Purple
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    setSlowEmaSeries(slowEma);

    // 4. Generate & Set Data
    const initialData = generateData(200);
    candles.setData(initialData);

    const fastEmaData = calculateEMA(initialData, 9);
    const slowEmaData = calculateEMA(initialData, 21);
    
    fastEma.setData(fastEmaData);
    slowEma.setData(slowEmaData);

    // 5. Add Strategy Markers (Signals)
    const markers = [];
    for (let i = 20; i < initialData.length; i++) {
      const prevFast = fastEmaData[i-1].value;
      const prevSlow = slowEmaData[i-1].value;
      const currFast = fastEmaData[i].value;
      const currSlow = slowEmaData[i].value;

      if (prevFast <= prevSlow && currFast > currSlow) {
         markers.push({
           time: initialData[i].time,
           position: 'belowBar',
           color: '#22c55e',
           shape: 'arrowUp',
           text: 'BUY',
           size: 2,
         });
      } else if (prevFast >= prevSlow && currFast < currSlow) {
         markers.push({
           time: initialData[i].time,
           position: 'aboveBar',
           color: '#ef4444',
           shape: 'arrowDown',
           text: 'SELL',
           size: 2,
         });
      }
    }
    
    // Safely set markers (markers API available on chart, not series in newer versions)
    try {
      if (markers.length > 0) {
        (candles as any).setMarkers?.(markers);
      }
    } catch (e) {
      // Markers not supported in this version
    }

    // Cleanup
    return () => {
      chart.remove();
    };
  }, []);

  // Toggle Strategy Visibility
  useEffect(() => {
    if (fastEmaSeries && slowEmaSeries) {
      fastEmaSeries.applyOptions({ visible: showStrategy });
      slowEmaSeries.applyOptions({ visible: showStrategy });
    }
  }, [showStrategy, fastEmaSeries, slowEmaSeries]);

  const displayPrice = livePrice ? ((livePrice.bid + livePrice.ask) / 2).toFixed(2) : "2,042.58";
  
  return (
    <Card className="h-full border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0 border-b border-border/20 bg-card/50">
        <div className="space-y-1">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            XAUUSD <span className="text-muted-foreground font-sans text-sm font-normal">Gold vs US Dollar</span>
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
          </CardTitle>
          <div className="flex items-center gap-4">
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
                </div>
              )}
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono">
                +0.45%
              </Badge>
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
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 bg-background/50 border-border/50"
            onClick={() => setShowStrategy(!showStrategy)}
            title="Toggle Strategy"
          >
            {showStrategy ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-background/50 border-border/50">
             <Maximize2 className="w-4 h-4" />
          </Button>
          <Select defaultValue="1h">
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
        <div ref={chartContainerRef} className="absolute inset-0" />
      </CardContent>
    </Card>
  );
}