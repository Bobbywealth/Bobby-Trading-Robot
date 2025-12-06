import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Save, RotateCcw, Code, Zap, Layers } from "lucide-react";

export function StrategyEditor() {
  const [strategyType, setStrategyType] = useState("custom");

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
            <Label>Strategy Mode</Label>
            <Select value={strategyType} onValueChange={setStrategyType}>
              <SelectTrigger>
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
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button size="sm" className="h-7 bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="w-3.5 h-3.5 mr-1" /> Save Strategy
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
            defaultValue={`def on_tick(data, account):
    # Trading Logic
    ema_fast = indicators.ema(data.close, 9)
    ema_slow = indicators.ema(data.close, 21)
    
    current_price = data.close[-1]
    
    if ema_fast[-1] > ema_slow[-1] and not position.is_open:
        # Bullish Crossover
        trade.buy(
            symbol="XAUUSD",
            volume=0.1,
            sl=current_price - 2.50,
            tp=current_price + 5.00
        )
        log.info("Buy Signal Executed")
        
    elif ema_fast[-1] < ema_slow[-1] and position.is_long:
        # Bearish Crossover - Close Longs
        trade.close_all()
        log.info("Closing Long Positions")`}
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