import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrades } from "@/lib/api";

export function ActiveTrades() {
  const {
    data: trades = [],
    isLoading,
    error,
    refetch,
  } = useTrades(10);
  const openTrades = trades.filter(trade => trade.status === "open");

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
        <Badge variant="secondary" className="font-mono" data-testid="badge-open-count">{openTrades.length} OPEN</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {trades.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-sm space-y-3" data-testid="text-no-trades">
            <p>No trades yet</p>
            <div className="flex justify-center">
              <Button asChild size="sm" variant="outline">
                <Link href="/strategy">Create a strategy to start trading</Link>
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Symbol</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Entry</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Exit</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">P/L ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id} className="border-border/50 hover:bg-white/5 font-mono text-sm" data-testid={`row-trade-${trade.id}`}>
                  <TableCell className="font-medium text-foreground" data-testid={`text-symbol-${trade.id}`}>{trade.symbol}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "border-0 text-xs font-bold px-1.5 py-0.5",
                        trade.side === "buy" 
                          ? "bg-primary/10 text-primary" 
                          : "bg-destructive/10 text-destructive"
                      )}
                      data-testid={`badge-side-${trade.id}`}
                    >
                      {trade.side.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground" data-testid={`text-entry-${trade.id}`}>
                    {trade.entryPrice ? Number(trade.entryPrice).toFixed(2) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-foreground" data-testid={`text-exit-${trade.id}`}>
                    {trade.exitPrice ? Number(trade.exitPrice).toFixed(2) : '-'}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-bold",
                    Number(trade.pnl || 0) >= 0 ? "text-primary glow-text-primary" : "text-destructive"
                  )} data-testid={`text-pnl-${trade.id}`}>
                    {Number(trade.pnl || 0) > 0 ? "+" : ""}{Number(trade.pnl || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}