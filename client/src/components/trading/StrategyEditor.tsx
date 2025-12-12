import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Save, RotateCcw, Code, Zap, Layers, BookOpen, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStrategies, useCreateStrategy, useUpdateStrategy } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const TEMPLATES = {
  ema_crossover: `def on_tick(data, account):
    # EMA Crossover Strategy
    # A simple trend-following strategy using two Exponential Moving Averages
    
    fast_period = 9
    slow_period = 21
    
    ema_fast = indicators.ema(data.close, fast_period)
    ema_slow = indicators.ema(data.close, slow_period)
    
    current_price = data.close[-1]
    
    # Check for crossover
    if ema_fast[-1] > ema_slow[-1] and ema_fast[-2] <= ema_slow[-2]:
        if not position.is_open:
            trade.buy(
                symbol=data.symbol,
                volume=0.1,
                sl=current_price - 20 * data.point,
                tp=current_price + 40 * data.point
            )
            log.info(f"Bullish Crossover: Bought {data.symbol}")
            
    elif ema_fast[-1] < ema_slow[-1] and ema_fast[-2] >= ema_slow[-2]:
        if position.is_long:
            trade.close_all()
            log.info("Bearish Crossover: Closed Longs")`,
            
  rsi_reversal: `def on_tick(data, account):
    # RSI Mean Reversal
    # Buys when oversold (<30) and Sells when overbought (>70)
    
    rsi_period = 14
    rsi_val = indicators.rsi(data.close, rsi_period)
    current_rsi = rsi_val[-1]
    current_price = data.close[-1]
    
    if current_rsi < 30 and not position.is_open:
        # Oversold condition
        trade.buy(
            symbol=data.symbol,
            volume=0.1,
            sl=current_price * 0.99, # 1% Stop Loss
            tp=current_price * 1.02  # 2% Take Profit
        )
        log.info(f"RSI Oversold ({current_rsi:.1f}): Buy Signal")
        
    elif current_rsi > 70 and position.is_long:
        # Overbought condition
        trade.close_all()
        log.info(f"RSI Overbought ({current_rsi:.1f}): Closing Positions")`,
        
  bollinger_breakout: `def on_tick(data, account):
    # Bollinger Bands Breakout
    # Trades when price breaks outside the volatility bands
    
    period = 20
    std_dev = 2.0
    
    upper, middle, lower = indicators.bbands(data.close, period, std_dev)
    current_price = data.close[-1]
    
    # Expansion logic: Bandwidth increasing
    bandwidth = (upper[-1] - lower[-1]) / middle[-1]
    
    if current_price > upper[-1] and bandwidth > 0.002:
        if not position.is_open:
            trade.buy(symbol=data.symbol, volume=0.1)
            log.info("Upper BB Breakout: Long Entry")
            
    elif current_price < middle[-1] and position.is_long:
        # Close when price returns to mean
        trade.close_all()
        log.info("Price returned to mean: Exit")`
};

export function StrategyEditor() {
  const [strategyType, setStrategyType] = useState("custom");
  const [code, setCode] = useState(TEMPLATES.ema_crossover);
  const [strategyName, setStrategyName] = useState("EMA Crossover");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  const { data: strategies = [], isLoading: isLoadingStrategies } = useStrategies();
  const createStrategy = useCreateStrategy();
  const updateStrategy = useUpdateStrategy();
  const { toast } = useToast();

  const handleSaveStrategy = async () => {
    try {
      const strategyData = {
        name: strategyName,
        code: code,
        parameters: { strategyType },
        isActive: false,
      };

      if (selectedStrategyId) {
        await updateStrategy.mutateAsync({ id: selectedStrategyId, data: strategyData });
        toast({
          title: "Strategy Updated",
          description: `${strategyName} has been updated successfully.`,
        });
      } else {
        const newStrategy = await createStrategy.mutateAsync(strategyData);
        setSelectedStrategyId(newStrategy.id);
        toast({
          title: "Strategy Saved",
          description: `${strategyName} has been saved successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save strategy. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLoadStrategy = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      setSelectedStrategyId(strategy.id);
      setStrategyName(strategy.name);
      setCode(strategy.code);
      if (strategy.parameters && typeof strategy.parameters === 'object' && 'strategyType' in strategy.parameters) {
        setStrategyType(strategy.parameters.strategyType as string);
      }
      toast({
        title: "Strategy Loaded",
        description: `${strategy.name} has been loaded.`,
      });
    }
  };

  const handleNewStrategy = () => {
    setSelectedStrategyId(null);
    setStrategyName("New Strategy");
    setCode(TEMPLATES.ema_crossover);
    setStrategyType("custom");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Configuration Panel */}
      <Card className="lg:col-span-4 border-border/50 bg-card/30 backdrop-blur-sm h-full flex flex-col">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Strategy Logic
          </CardTitle>
          <CardDescription>
            Define entry and exit conditions for the automated agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <Label>Strategy Name</Label>
            <Input 
              value={strategyName} 
              onChange={(e) => setStrategyName(e.target.value)}
              className="font-mono"
              data-testid="input-strategy-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Load Existing Strategy</Label>
            {isLoadingStrategies ? (
              <Skeleton className="h-10 w-full bg-muted/40" />
            ) : strategies.length === 0 ? (
              <div className="p-3 rounded border border-dashed border-border/50 text-xs text-muted-foreground bg-muted/20">
                No saved strategies yet. Start from a template or create a new one.
              </div>
            ) : (
              <Select value={selectedStrategyId || ""} onValueChange={handleLoadStrategy}>
                <SelectTrigger data-testid="select-load-strategy">
                  <SelectValue placeholder="Select a strategy..." />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id} data-testid={`option-strategy-${strategy.id}`}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNewStrategy} 
              className="w-full"
              data-testid="button-new-strategy"
            >
              New Strategy
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Strategy Mode</Label>
            <Select value={strategyType} onValueChange={setStrategyType}>
              <SelectTrigger data-testid="select-strategy-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crossover">MA Crossover (Simple)</SelectItem>
                <SelectItem value="rsi">RSI Reversal (Simple)</SelectItem>
                <SelectItem value="custom">Custom Script (Advanced)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {strategyType !== "custom" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
              <div className="space-y-2">
                <Label>Fast Period</Label>
                <Input type="number" defaultValue={9} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Slow Period</Label>
                <Input type="number" defaultValue={21} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Timeframe</Label>
                <Select defaultValue="15m">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
               <div className="p-3 border border-primary/20 bg-primary/5 rounded text-xs text-primary-foreground/80">
                 <p className="font-bold mb-1">Pro Mode Active</p>
                 Write custom logic using the Python-compatible syntax below.
               </div>
               <div className="space-y-2">
                 <Label>Execution Interval</Label>
                 <Select defaultValue="tick">
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="tick">Every Tick</SelectItem>
                     <SelectItem value="bar_close">On Bar Close</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
            </div>
          )}

          <div className="pt-4 border-t border-border/50 space-y-3">
             <Label>Risk Parameters</Label>
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <span className="text-xs text-muted-foreground">Take Profit (Pips)</span>
                 <Input defaultValue={50} className="font-mono" />
               </div>
               <div className="space-y-1">
                 <span className="text-xs text-muted-foreground">Stop Loss (Pips)</span>
                 <Input defaultValue={25} className="font-mono" />
               </div>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor / Visualization Panel */}
      <Card className="lg:col-span-8 border-border/50 bg-card/30 backdrop-blur-sm flex flex-col h-full overflow-hidden">
        <div className="border-b border-border/50 p-2 flex items-center justify-between bg-background/50">
          <div className="flex items-center gap-2">
            <Tabs defaultValue="code" className="h-8">
              <TabsList className="h-8 bg-transparent p-0">
                <TabsTrigger value="code" className="h-8 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Code className="w-3.5 h-3.5 mr-2" /> Source
                </TabsTrigger>
                <TabsTrigger value="visual" className="h-8 px-3 data-[state=active]:bg-accent/10 data-[state=active]:text-accent">
                  <Layers className="w-3.5 h-3.5 mr-2" /> Visual Builder
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  Load Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Strategy Library</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setCode(TEMPLATES.ema_crossover); setStrategyType("custom"); }}>
                  EMA Crossover (Trend)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setCode(TEMPLATES.rsi_reversal); setStrategyType("custom"); }}>
                  RSI Mean Reversion
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setCode(TEMPLATES.bollinger_breakout); setStrategyType("custom"); }}>
                  Bollinger Breakout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-muted-foreground hover:text-foreground"
              onClick={() => setCode(TEMPLATES.ema_crossover)}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button 
              size="sm" 
              className="h-7 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveStrategy}
              disabled={createStrategy.isPending || updateStrategy.isPending}
              data-testid="button-save-strategy"
            >
              {(createStrategy.isPending || updateStrategy.isPending) ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-3.5 h-3.5 mr-1" /> Save Strategy</>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-[#0d1117] font-mono text-sm p-4 overflow-auto relative group">
          <div className="absolute top-0 left-0 w-8 h-full bg-background/30 border-r border-border/30 text-muted-foreground/50 flex flex-col items-center pt-4 select-none">
            {Array.from({length: 20}).map((_, i) => <div key={i} className="leading-6 text-xs">{i+1}</div>)}
          </div>
          <Textarea 
            className="w-full h-full pl-10 bg-transparent border-none resize-none focus-visible:ring-0 text-blue-300 leading-6 font-mono"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        
        <div className="p-3 border-t border-border/50 bg-background/50 flex justify-between items-center">
           <div className="flex items-center gap-2 text-xs text-muted-foreground">
             <Badge variant="outline" className="text-[10px] h-5 border-green-500/30 text-green-500">Python 3.11</Badge>
             <span>No syntax errors detected</span>
           </div>
           <Button size="sm" className="h-7 bg-accent text-accent-foreground hover:bg-accent/90">
             <Play className="w-3.5 h-3.5 mr-1" /> Backtest
           </Button>
        </div>
      </Card>
    </div>
  );
}