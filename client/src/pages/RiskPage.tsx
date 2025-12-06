import { Sidebar } from "@/components/trading/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Shield, AlertTriangle, Clock, Ban, Save } from "lucide-react";

export default function RiskPage() {
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
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" /> Save Changes
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
                  <Input className="w-24 font-mono text-right" defaultValue="500" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Max Daily Loss (%)</Label>
                    <p className="text-xs text-muted-foreground">Stop trading if loss exceeds % of equity</p>
                  </div>
                  <Input className="w-24 font-mono text-right" defaultValue="3.0" />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-destructive font-bold">Equity Protector</Label>
                    <p className="text-xs text-muted-foreground">Close ALL positions if equity drops below level</p>
                  </div>
                  <Switch />
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
                    <span className="font-mono font-bold">3</span>
                  </div>
                  <Slider defaultValue={[3]} max={10} step={1} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Max Lot Size (Lots)</Label>
                    <span className="font-mono font-bold">5.0</span>
                  </div>
                  <Slider defaultValue={[5]} max={20} step={0.1} />
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
                <Switch defaultChecked />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Start Hour (GMT)</Label>
                   <Input type="time" defaultValue="08:00" className="font-mono" />
                 </div>
                 <div className="space-y-2">
                   <Label>End Hour (GMT)</Label>
                   <Input type="time" defaultValue="17:00" className="font-mono" />
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
                {["USDTRY", "BTCUSD", "US30", "XAGUSD"].map(pair => (
                  <Badge key={pair} variant="secondary" className="flex gap-1 hover:bg-destructive/20 cursor-pointer">
                    {pair} <span className="text-muted-foreground ml-1">×</span>
                  </Badge>
                ))}
                <Badge variant="outline" className="border-dashed cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary">
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