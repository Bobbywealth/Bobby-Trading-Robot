import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBrokerPositions } from "@/lib/api";

export function ActiveTrades() {
  const {
    data: positions = [],
    isLoading,
    error,
    refetch,
  } = useBrokerPositions();

  const openPositions = positions || [];

  if (isLoading) {
    return (
      <Card className="h-full border-border/50 bg-card/30 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-display text-lg">Live Positions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-muted-foreground font-mono text-sm" data-testid="text-loading">Loading trades...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-border/50 bg-destructive/5 border-destructive/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-display text-lg text-destructive">Live Positions</CardTitle>
          <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">Error</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 items-start p-6">
          <p className="text-sm text-destructive/80 font-mono">
            We couldn&apos;t load your trades. Check connectivity and retry.
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/50 bg-card/30 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-display text-lg">Live Positions</CardTitle>
        <Badge variant="secondary" className="font-mono" data-testid="badge-open-count">{openPositions.length} OPEN</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {openPositions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-sm space-y-3" data-testid="text-no-trades">
            <p>No trades yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Symbol</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Size</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Price</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">P/L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openPositions.map((pos, idx) => {
                const symbol = pos.symbol || pos.s || pos.instrument || "—";
                const side = (pos.side || pos.positionSide || pos.direction || "").toString().toLowerCase();
                const size = pos.qty || pos.quantity || pos.volume || pos.size;
                const price = pos.price || pos.entryPrice || pos.avgPrice || pos.avg_entry_price;
                const pnl = pos.pnl ?? pos.unrealizedPnl ?? pos.unrealized_pnl ?? pos.profit;
                const idKey = pos.id ?? pos.positionId ?? `${symbol}-${idx}`;

                return (
                  <TableRow key={idKey} className="border-border/50 hover:bg-white/5 font-mono text-sm" data-testid={`row-pos-${idKey}`}>
                    <TableCell className="font-medium text-foreground" data-testid={`text-symbol-${idKey}`}>{symbol}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "border-0 text-xs font-bold px-1.5 py-0.5",
                        side === "buy" 
                          ? "bg-primary/10 text-primary" 
                          : "bg-destructive/10 text-destructive"
                      )}
                      data-testid={`badge-side-${idKey}`}
                    >
                      {(side || "—").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground" data-testid={`text-size-${idKey}`}>
                    {size ? Number(size).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right text-foreground" data-testid={`text-price-${idKey}`}>
                    {price ? Number(price).toFixed(5) : "—"}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-bold",
                    Number(pnl || 0) >= 0 ? "text-primary glow-text-primary" : "text-destructive"
                  )} data-testid={`text-pnl-${idKey}`}>
                    {Number(pnl || 0) > 0 ? "+" : ""}
                    {pnl != null ? Number(pnl).toFixed(2) : "—"}
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}