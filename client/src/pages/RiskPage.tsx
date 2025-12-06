import { Sidebar } from "@/components/trading/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Clock, Ban, Save, Loader2 } from "lucide-react";
import { useRiskConfig, useUpsertRiskConfig } from "@/lib/api";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function RiskPage() {
  const { data: riskConfig, isLoading } = useRiskConfig();
  const upsertRiskConfig = useUpsertRiskConfig();
  const { toast } = useToast();

  const [maxDailyLossDollar, setMaxDailyLossDollar] = useState("");
  const [maxDailyLossPercent, setMaxDailyLossPercent] = useState("");
  const [maxPositionSize, setMaxPositionSize] = useState(3);
  const [maxLotSize, setMaxLotSize] = useState(5.0);
  const [newsFilterEnabled, setNewsFilterEnabled] = useState(true);
  const [tradingHoursStart, setTradingHoursStart] = useState("08:00");
  const [tradingHoursEnd, setTradingHoursEnd] = useState("17:00");
  const [assetBlacklist, setAssetBlacklist] = useState<string[]>([]);

  useEffect(() => {
    if (riskConfig) {
      setMaxDailyLossDollar(riskConfig.maxDailyLossDollar?.toString() || "500");
      setMaxDailyLossPercent(riskConfig.maxDailyLossPercent?.toString() || "3.0");
      setMaxPositionSize(riskConfig.maxPositionSize || 3);
      setMaxLotSize(Number(riskConfig.maxLotSize || 5.0));
      setNewsFilterEnabled(riskConfig.newsFilterEnabled || true);
      setTradingHoursStart(riskConfig.tradingHoursStart || "08:00");
      setTradingHoursEnd(riskConfig.tradingHoursEnd || "17:00");
      setAssetBlacklist(riskConfig.assetBlacklist || ["USDTRY", "BTCUSD", "US30", "XAGUSD"]);
    } else {
      setAssetBlacklist(["USDTRY", "BTCUSD", "US30", "XAGUSD"]);
    }
  }, [riskConfig]);

  const handleSaveConfig = async () => {
    try {
      await upsertRiskConfig.mutateAsync({
        maxDailyLossDollar: maxDailyLossDollar || null,
        maxDailyLossPercent: maxDailyLossPercent || null,
        maxPositionSize: maxPositionSize || null,
        maxLotSize: maxLotSize.toString(),
        tradingHoursStart: tradingHoursStart || null,
        tradingHoursEnd: tradingHoursEnd || null,
        newsFilterEnabled: newsFilterEnabled,
        assetBlacklist: assetBlacklist,
      });
      toast({
        title: "Risk Configuration Saved",
        description: "Your risk settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save risk configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeAsset = (asset: string) => {
    setAssetBlacklist(prev => prev.filter(a => a !== asset));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <div className="z-10 relative">
          <Sidebar />
        </div>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <p className="text-muted-foreground font-mono" data-testid="text-loading">Loading risk configuration...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      <div className="z-10 relative">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 overflow-y-auto z-10 relative h-screen">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground tracking-wide flex items-center gap-2">
              RISK PROTOCOLS <span className="text-destructive">///</span>
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              CAPITAL PRESERVATION CONFIGURATION
            </p>
          </div>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSaveConfig}
            disabled={upsertRiskConfig.isPending}
            data-testid="button-save-config"
          >
            {upsertRiskConfig.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
          {/* Daily Limits */}
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                Daily Drawdown Limits
              </CardTitle>
              <CardDescription>Hard stops to prevent catastrophic loss days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Max Daily Loss ($)</Label>
                    <p className="text-xs text-muted-foreground">Stop trading if loss exceeds value</p>
                  </div>
                  <Input 
                    className="w-24 font-mono text-right" 
                    value={maxDailyLossDollar}
                    onChange={(e) => setMaxDailyLossDollar(e.target.value)}
                    data-testid="input-max-loss-dollar"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Max Daily Loss (%)</Label>
                    <p className="text-xs text-muted-foreground">Stop trading if loss exceeds % of equity</p>
                  </div>
                  <Input 
                    className="w-24 font-mono text-right" 
                    value={maxDailyLossPercent}
                    onChange={(e) => setMaxDailyLossPercent(e.target.value)}
                    data-testid="input-max-loss-percent"
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-destructive font-bold">Equity Protector</Label>
                    <p className="text-xs text-muted-foreground">Close ALL positions if equity drops below level</p>
                  </div>
                  <Switch data-testid="switch-equity-protector" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Constraints */}
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-accent" />
                Trade Constraints
              </CardTitle>
              <CardDescription>Limits per trade and session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Max Open Positions</Label>
                    <span className="font-mono font-bold" data-testid="text-max-positions">{maxPositionSize}</span>
                  </div>
                  <Slider 
                    value={[maxPositionSize]} 
                    onValueChange={(val) => setMaxPositionSize(val[0])} 
                    max={10} 
                    step={1}
                    data-testid="slider-max-positions"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Max Lot Size (Lots)</Label>
                    <span className="font-mono font-bold" data-testid="text-max-lot-size">{maxLotSize.toFixed(1)}</span>
                  </div>
                  <Slider 
                    value={[maxLotSize]} 
                    onValueChange={(val) => setMaxLotSize(val[0])} 
                    max={20} 
                    step={0.1}
                    data-testid="slider-max-lot-size"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label>Martingale / Grid Mode</Label>
                  <Switch checked={false} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* News & Time */}
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Session & News Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-border/50 rounded bg-background/30">
                <div className="space-y-0.5">
                  <Label>High Impact News Filter</Label>
                  <p className="text-xs text-muted-foreground">Pause 30m before/after red folder news</p>
                </div>
                <Switch 
                  checked={newsFilterEnabled}
                  onCheckedChange={setNewsFilterEnabled}
                  data-testid="switch-news-filter"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Start Hour (GMT)</Label>
                   <Input 
                     type="time" 
                     value={tradingHoursStart} 
                     onChange={(e) => setTradingHoursStart(e.target.value)}
                     className="font-mono"
                     data-testid="input-trading-start"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>End Hour (GMT)</Label>
                   <Input 
                     type="time" 
                     value={tradingHoursEnd} 
                     onChange={(e) => setTradingHoursEnd(e.target.value)}
                     className="font-mono"
                     data-testid="input-trading-end"
                   />
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset Blacklist */}
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                Asset Blacklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {assetBlacklist.map(pair => (
                  <Badge 
                    key={pair} 
                    variant="secondary" 
                    className="flex gap-1 hover:bg-destructive/20 cursor-pointer"
                    onClick={() => removeAsset(pair)}
                    data-testid={`badge-asset-${pair}`}
                  >
                    {pair} <span className="text-muted-foreground ml-1">×</span>
                  </Badge>
                ))}
                <Badge 
                  variant="outline" 
                  className="border-dashed cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary"
                  data-testid="badge-add-asset"
                >
                  + Add Pair
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                These assets will be ignored by all strategies regardless of signals.
              </p>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}