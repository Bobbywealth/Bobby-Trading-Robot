import { Area, ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generate realistic-looking market data with signals
const generateData = () => {
  let price = 2035.00;
  const data = [];
  let fastMA = price;
  let slowMA = price;
  
  for (let i = 0; i < 100; i++) {
    const change = (Math.random() - 0.48) * 2; // Slight upward bias
    price += change;
    
    // Simple moving average calculation simulation
    fastMA = fastMA * 0.8 + price * 0.2;
    slowMA = slowMA * 0.9 + price * 0.1;
    
    let signal = null;
    // Generate signals based on crossovers
    if (i > 10) {
      const prevFast = data[i-1].fastMA;
      const prevSlow = data[i-1].slowMA;
      
      if (prevFast <= prevSlow && fastMA > slowMA) signal = "buy";
      if (prevFast >= prevSlow && fastMA < slowMA) signal = "sell";
    }

    data.push({
      time: `${10 + Math.floor(i/60)}:${(i%60).toString().padStart(2, '0')}`,
      price: price,
      fastMA: fastMA,
      slowMA: slowMA,
      buySignal: signal === "buy" ? price - 1 : null,
      sellSignal: signal === "sell" ? price + 1 : null,
    });
  }
  return data;
};

const data = generateData();

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded shadow-xl text-xs space-y-1">
        <p className="font-mono text-muted-foreground mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-foreground">Price:</span>
          <span className="font-mono font-bold">{payload[0]?.value.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-cyan-400">EMA(9):</span>
          <span className="font-mono">{payload[1]?.value.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-purple-400">EMA(21):</span>
          <span className="font-mono">{payload[2]?.value.toFixed(2)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function MarketChart() {
  const [showStrategy, setShowStrategy] = useState(true);

  return (
    <Card className="h-full border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
        <div className="space-y-1">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            XAUUSD <span className="text-muted-foreground font-sans text-sm font-normal">Gold vs US Dollar</span>
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-foreground">2,042.58</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono">
                +0.45%
              </Badge>
            </div>
            <div className="h-4 w-[1px] bg-border/50" />
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-muted-foreground">EMA 9</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-muted-foreground">EMA 21</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 bg-background/50 border-border/50"
            onClick={() => setShowStrategy(!showStrategy)}
          >
            {showStrategy ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
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
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="w-full h-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Main Price Area */}
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
              
              {/* Strategy Indicators */}
              {showStrategy && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="fastMA" 
                    stroke="#22d3ee" 
                    strokeWidth={1.5} 
                    dot={false} 
                    strokeOpacity={0.8}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="slowMA" 
                    stroke="#c084fc" 
                    strokeWidth={1.5} 
                    dot={false} 
                    strokeOpacity={0.8}
                  />
                  
                  {/* Buy Signals */}
                  <Scatter 
                    dataKey="buySignal" 
                    fill="hsl(var(--primary))" 
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload.buySignal) return null;
                      return (
                        <g transform={`translate(${cx},${cy})`}>
                          <circle r="4" fill="hsl(var(--primary))" fillOpacity={0.5} />
                          <circle r="2" fill="hsl(var(--primary))" />
                          <text x="0" y="15" textAnchor="middle" fill="hsl(var(--primary))" fontSize="10" fontWeight="bold">BUY</text>
                        </g>
                      );
                    }}
                  />
                  
                  {/* Sell Signals */}
                  <Scatter 
                    dataKey="sellSignal" 
                    fill="hsl(var(--destructive))" 
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload.sellSignal) return null;
                      return (
                        <g transform={`translate(${cx},${cy})`}>
                          <circle r="4" fill="hsl(var(--destructive))" fillOpacity={0.5} />
                          <circle r="2" fill="hsl(var(--destructive))" />
                          <text x="0" y="-10" textAnchor="middle" fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold">SELL</text>
                        </g>
                      );
                    }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}