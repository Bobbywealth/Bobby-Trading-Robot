import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Wifi, Wallet, PlugZap, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrokerStatus, useRiskConfig } from "@/lib/api";

export function BotControls() {
  const [isActive, setIsActive] = useState(false);
  const [risk, setRisk] = useState([1.5]);
  const { data: brokerStatus, isLoading: brokerLoading } = useBrokerStatus();
  const { data: riskConfig, isLoading: riskLoading } = useRiskConfig();
  const isConnected = brokerStatus?.connected && brokerStatus?.accountNumber;

  return (
    <div className="space-y-4">
      {/* Main Control */}
      <Card className={cn(
        "border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-500",
        isActive && "shadow-[0_0_30px_rgba(0,255,128,0.1)] border-primary/30"
      )}>
        <CardHeader>
          <CardTitle className="font-display flex items-center justify-between">
            <span>System Status</span>
            <div className="flex items-center gap-2 text-xs font-sans font-normal">
              <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
              {isActive ? "RUNNING" : "STANDBY"}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            className={cn(
              "w-full h-14 text-lg font-bold tracking-wider transition-all duration-300 font-display",
              isActive 
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive border border-destructive/20" 
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,128,0.3)]"
            )}
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? (
              <>
                <Pause className="mr-2 w-5 h-5" /> HALT OPERATIONS
              </>
            ) : (
              <>
                <Play className="mr-2 w-5 h-5" /> INITIALIZE BOT
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded bg-background/50 border border-border/50">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Wifi className="w-3 h-3" /> Latency
              </div>
              <div className="text-xl font-mono font-bold text-primary">12ms</div>
            </div>
            <div className="p-3 rounded bg-background/50 border border-border/50">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Balance
              </div>
              <div className="text-xl font-mono font-bold text-foreground">$10,450</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection & Risk Snapshot */}
      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-display text-md flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-primary" /> Connection & Risk
          </CardTitle>
          <CardDescription>Quick health check for live trading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded border border-border/50 bg-background/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Broker Status</p>
              {brokerLoading ? (
                <Skeleton className="h-4 w-32 bg-muted/40" />
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? "outline" : "secondary"} className={isConnected ? "border-primary/50 text-primary bg-primary/10" : "bg-muted text-muted-foreground"}>
                    {isConnected ? "Connected" : "Not connected"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {isConnected ? `Acct #${brokerStatus?.accountNumber}` : "Live feed paused"}
                  </span>
                </div>
              )}
            </div>
            {!isConnected && (
              <Button asChild size="sm" className="h-8">
                <Link href="/connect">Connect</Link>
              </Button>
            )}
          </div>

          <div className="p-3 rounded border border-border/50 bg-background/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-accent" />
                <p className="text-sm font-medium">Risk Guardrails</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Link href="/risk">Edit</Link>
              </Button>
            </div>
            {riskLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 bg-muted/40" />
                <Skeleton className="h-10 bg-muted/40" />
                <Skeleton className="h-10 bg-muted/40" />
                <Skeleton className="h-10 bg-muted/40" />
              </div>
            ) : riskConfig ? (
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2 rounded bg-muted/20 border border-border/40">
                  <p className="text-muted-foreground uppercase tracking-wide">Daily Loss ($)</p>
                  <p className="text-foreground font-semibold text-sm">
                    {riskConfig.maxDailyLossDollar ?? "—"}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/20 border border-border/40">
                  <p className="text-muted-foreground uppercase tracking-wide">Daily Loss (%)</p>
                  <p className="text-foreground font-semibold text-sm">
                    {riskConfig.maxDailyLossPercent ?? "—"}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/20 border border-border/40">
                  <p className="text-muted-foreground uppercase tracking-wide">Max Positions</p>
                  <p className="text-foreground font-semibold text-sm">
                    {riskConfig.maxPositionSize ?? "—"}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/20 border border-border/40">
                  <p className="text-muted-foreground uppercase tracking-wide">Max Lot Size</p>
                  <p className="text-foreground font-semibold text-sm">
                    {riskConfig.maxLotSize ?? "—"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded border border-dashed border-border/50 text-xs text-muted-foreground bg-muted/10">
                No risk profile set. Configure guardrails before live trading.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-display text-md flex items-center gap-2">
            <ShieldIcon className="w-4 h-4 text-accent" /> Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Risk Per Trade</Label>
              <span className="font-mono text-accent font-bold">{risk}%</span>
            </div>
            <Slider 
              value={risk} 
              onValueChange={setRisk} 
              max={5} 
              step={0.1} 
              className="[&>.relative>.absolute]:bg-accent"
            />
            <p className="text-xs text-muted-foreground">
              Maximum drawdown per trade calculated based on equity.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded border border-border/50 bg-background/30">
            <div className="space-y-0.5">
              <Label className="text-sm">News Filter</Label>
              <p className="text-xs text-muted-foreground">Pause during high impact news</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between p-3 rounded border border-border/50 bg-background/30">
            <div className="space-y-0.5">
              <Label className="text-sm">Trailing Stop</Label>
              <p className="text-xs text-muted-foreground">Auto-lock profits</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}