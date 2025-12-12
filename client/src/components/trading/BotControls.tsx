import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  Pause,
  Wifi,
  Wallet,
  PlugZap,
  ShieldAlert,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useBrokerStatus,
  useRiskConfig,
  useBrokerInstruments,
  useBrokerQuotes,
  usePlaceOrder,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function BotControls() {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [risk, setRisk] = useState([1.5]);
  const [instrumentId, setInstrumentId] = useState<number | null>(null);
  const [qty, setQty] = useState<number>(0.01);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"market" | "limit" | "stop">("market");
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [stopLoss, setStopLoss] = useState<number | undefined>(undefined);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(undefined);

  const { data: brokerStatus, isLoading: brokerLoading } = useBrokerStatus();
  const { data: riskConfig, isLoading: riskLoading } = useRiskConfig();
  const isConnected = brokerStatus?.connected && brokerStatus?.accountNumber;
  const instrumentsQuery = useBrokerInstruments(Boolean(isConnected));
  const instruments = Array.isArray(instrumentsQuery.data) ? instrumentsQuery.data : [];

  const selectedInstrument = instrumentsQuery.data?.find(
    (i) => i.tradableInstrumentId === instrumentId,
  );
  const quoteSymbols = selectedInstrument ? [selectedInstrument.name] : [];
  const quotesQuery = useBrokerQuotes(quoteSymbols, Boolean(isConnected && instrumentId));
  const latestQuote = quotesQuery.data?.[0];

  const placeOrder = usePlaceOrder();

  const submitOrder = async () => {
    if (!instrumentId) return;
    try {
      await placeOrder.mutateAsync({
        instrumentId,
        qty,
        side,
        type,
        price: type === "market" ? undefined : price,
        stopLoss,
        takeProfit,
      });
      toast({
        title: "Order placed",
        description: `${side.toUpperCase()} ${qty} on ${selectedInstrument?.name ?? instrumentId}`,
      });
    } catch (err: any) {
      toast({
        title: "Order failed",
        description: err?.message || "Unable to place order",
        variant: "destructive",
      });
    }
  };

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

          {isConnected && (
            <div className="p-3 rounded border border-border/50 bg-background/40 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Place Order</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Instrument</Label>
                    <Select
                      value={instrumentId ? String(instrumentId) : undefined}
                      onValueChange={(val) => setInstrumentId(Number(val))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select instrument" />
                      </SelectTrigger>
                      <SelectContent>
                        {instruments.map((inst) => (
                          <SelectItem key={inst.tradableInstrumentId} value={String(inst.tradableInstrumentId)}>
                            {inst.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={qty}
                      onChange={(e) => setQty(parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={side === "buy" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSide("buy")}
                  >
                    <ArrowUpCircle className="w-4 h-4 mr-2" /> Buy
                  </Button>
                  <Button
                    variant={side === "sell" ? "destructive" : "outline"}
                    className="w-full"
                    onClick={() => setSide("sell")}
                  >
                    <ArrowDownCircle className="w-4 h-4 mr-2" /> Sell
                  </Button>
                  <Select value={type} onValueChange={(v) => setType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="limit">Limit</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {type !== "market" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Price</Label>
                      <Input
                        type="number"
                        step={0.0001}
                        value={price ?? ""}
                        onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Stop Loss</Label>
                      <Input
                        type="number"
                        step={0.0001}
                        value={stopLoss ?? ""}
                        onChange={(e) => setStopLoss(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Take Profit</Label>
                      <Input
                        type="number"
                        step={0.0001}
                        value={takeProfit ?? ""}
                        onChange={(e) => setTakeProfit(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                )}

                <div className="p-2 rounded bg-muted/10 border border-dashed border-border/40 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>Last Quote</span>
                    <span>
                      {latestQuote
                        ? `${latestQuote.s} ${latestQuote.bid ?? "--"}/${latestQuote.ask ?? "--"}`
                        : "—"}
                    </span>
                  </div>
                  {placeOrder.isError && (
                    <div className="flex items-start gap-2 text-destructive mt-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5" />
                      <span>{(placeOrder.error as Error)?.message ?? "Order failed"}</span>
                    </div>
                  )}
                  {instrumentsQuery.isError && (
                    <div className="flex items-start gap-2 text-destructive mt-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5" />
                      <span>Failed to load instruments</span>
                    </div>
                  )}
                  {quotesQuery.isError && (
                    <div className="flex items-start gap-2 text-destructive mt-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5" />
                      <span>Failed to load quotes</span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  disabled={!instrumentId || placeOrder.isPending}
                  onClick={submitOrder}
                >
                  {placeOrder.isPending ? "Placing..." : "Confirm Order"}
                </Button>
              </div>
            </div>
          )}
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