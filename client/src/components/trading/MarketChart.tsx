import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const data = Array.from({ length: 50 }, (_, i) => ({
  time: `${10 + Math.floor(i/60)}:${(i%60).toString().padStart(2, '0')}`,
  price: 2030 + Math.random() * 15 + Math.sin(i/5) * 10,
  volume: Math.floor(Math.random() * 1000)
}));

export function MarketChart() {
  return (
    <Card className="h-full border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            XAUUSD <span className="text-muted-foreground font-sans text-sm font-normal">Gold vs US Dollar</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold text-foreground">2,042.58</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono">
              +0.45%
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
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
      <CardContent className="p-0 h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))', 
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius-md)',
                color: 'hsl(var(--foreground))'
              }}
              itemStyle={{ color: 'hsl(var(--primary))' }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}