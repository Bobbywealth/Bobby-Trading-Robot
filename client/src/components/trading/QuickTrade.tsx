import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useBrokerInstruments, useBrokerQuotes, usePlaceOrder, useBrokerStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function QuickTrade() {
  const { data: status } = useBrokerStatus();
  const isConnected = Boolean(status?.connected && status?.accountNumber);

  const [selectedInstrumentId, setSelectedInstrumentId] = useState<number | null>(null);
  const [size, setSize] = useState<number>(1);

  const { data: instruments = [], isLoading: instrumentsLoading } = useBrokerInstruments(isConnected);

  const safeInstruments = Array.isArray(instruments) ? instruments : [];

  const selectedInstrument = useMemo(
    () => safeInstruments.find((i) => i.tradableInstrumentId === selectedInstrumentId),
    [safeInstruments, selectedInstrumentId],
  );

  const { data: quotes } = useBrokerQuotes(
    selectedInstrument?.name ? [selectedInstrument.name] : [],
    Boolean(selectedInstrument?.name),
  );

  const { toast } = useToast();
  const placeOrder = usePlaceOrder();

  const bid = quotes?.[0]?.bid;
  const ask = quotes?.[0]?.ask;

  const disabled = !isConnected || !selectedInstrument || size <= 0 || placeOrder.isPending;

  const submit = async (side: "buy" | "sell") => {
    if (!selectedInstrument) return;
    try {
      await placeOrder.mutateAsync({
        instrumentId: selectedInstrument.tradableInstrumentId,
        qty: size,
        side,
        type: "market",
      });
      toast({
        title: "Order sent",
        description: `${side.toUpperCase()} ${size} ${selectedInstrument.name}`,
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
    <Card className="border-border/60 bg-card/30 backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="font-display text-lg">Quick Trade</CardTitle>
        <Badge variant={isConnected ? "outline" : "secondary"} className={cn(isConnected && "border-primary/40 text-primary bg-primary/10")}>
          {isConnected ? "Connected" : "Not connected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Select instrument</span>
            {instrumentsLoading && (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading
              </span>
            )}
          </div>
          <Select
            value={selectedInstrumentId ? String(selectedInstrumentId) : ""}
            onValueChange={(v) => setSelectedInstrumentId(Number(v))}
            disabled={!isConnected || instrumentsLoading || safeInstruments.length === 0}
          >
            <SelectTrigger data-testid="select-instrument">
              <SelectValue placeholder={isConnected ? "Choose instrument" : "Connect first"} />
            </SelectTrigger>
            <SelectContent>
              {safeInstruments.map((inst) => (
                <SelectItem key={inst.tradableInstrumentId} value={String(inst.tradableInstrumentId)}>
                  {inst.name} {inst.description ? `— ${inst.description}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {safeInstruments.length === 0 && isConnected && !instrumentsLoading && (
            <p className="text-xs text-muted-foreground">No instruments returned from broker.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded border border-border/50 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-1">Bid</p>
            <p className="font-mono text-lg">{bid != null ? bid : "—"}</p>
          </div>
          <div className="p-3 rounded border border-border/50 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-1">Ask</p>
            <p className="font-mono text-lg">{ask != null ? ask : "—"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Order size</p>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="font-mono"
            data-testid="input-size"
          />
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-primary text-primary-foreground font-bold shadow-[0_0_15px_rgba(0,255,128,0.2)]"
            onClick={() => submit("buy")}
            disabled={disabled}
            data-testid="button-buy"
          >
            {placeOrder.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Buy
          </Button>
          <Button
            className="flex-1 bg-destructive text-destructive-foreground font-bold"
            onClick={() => submit("sell")}
            disabled={disabled}
            data-testid="button-sell"
          >
            {placeOrder.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Sell
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

