import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const trades = [
  { id: "ORD-7829", symbol: "EURUSD", type: "BUY", size: 1.5, entry: 1.0842, current: 1.0855, pl: 195.00, status: "open" },
  { id: "ORD-7830", symbol: "GBPJPY", type: "SELL", size: 0.8, entry: 182.45, current: 182.55, pl: -74.40, status: "open" },
  { id: "ORD-7831", symbol: "XAUUSD", type: "BUY", size: 0.5, entry: 2038.10, current: 2042.58, pl: 224.00, status: "open" },
  { id: "ORD-7832", symbol: "BTCUSD", type: "SELL", size: 0.1, entry: 42150, current: 42000, pl: 150.00, status: "closed" },
  { id: "ORD-7833", symbol: "US30", type: "BUY", size: 2.0, entry: 37500, current: 37450, pl: -100.00, status: "closed" },
];

export function ActiveTrades() {
  return (
    <Card className="h-full border-border/50 bg-card/30 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-display text-lg">Live Positions</CardTitle>
        <Badge variant="secondary" className="font-mono">3 OPEN</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Symbol</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Entry</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Current</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">P/L ($)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id} className="border-border/50 hover:bg-white/5 font-mono text-sm">
                <TableCell className="font-medium text-foreground">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "border-0 text-xs font-bold px-1.5 py-0.5",
                      trade.type === "BUY" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {trade.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{trade.entry}</TableCell>
                <TableCell className="text-right text-foreground">{trade.current}</TableCell>
                <TableCell className={cn(
                  "text-right font-bold",
                  trade.pl >= 0 ? "text-primary glow-text-primary" : "text-destructive"
                )}>
                  {trade.pl > 0 ? "+" : ""}{trade.pl.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}