import { Sidebar } from "@/components/trading/Sidebar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Trash2, Filter, Terminal } from "lucide-react";
import { useState, useEffect } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  module: string;
  message: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: "1", timestamp: "10:42:05", level: "INFO", module: "SYS", message: "Bot initialized successfully. version=2.1.0" },
  { id: "2", timestamp: "10:42:06", level: "INFO", module: "CONN", message: "Connected to TradeLocker Demo (Latency: 12ms)" },
  { id: "3", timestamp: "10:45:22", level: "INFO", module: "STRAT", message: "Scanning 28 pairs for 'EMA Crossover' setup..." },
  { id: "4", timestamp: "10:45:23", level: "SUCCESS", module: "STRAT", message: "Signal Found: BUY XAUUSD @ 2038.10" },
  { id: "5", timestamp: "10:45:23", level: "INFO", module: "EXEC", message: "Order sent: BUY 0.5 lots XAUUSD" },
  { id: "6", timestamp: "10:45:24", level: "SUCCESS", module: "EXEC", message: "Order filled: #ORD-7831 @ 2038.10" },
  { id: "7", timestamp: "11:02:15", level: "WARN", module: "RISK", message: "High volatility detected on GBPUSD (News Event)" },
  { id: "8", timestamp: "11:05:00", level: "INFO", module: "STRAT", message: "Skipping GBPUSD trade due to news filter" },
  { id: "9", timestamp: "11:15:30", level: "ERROR", module: "CONN", message: "Heartbeat missed. Retrying connection..." },
  { id: "10", timestamp: "11:15:31", level: "SUCCESS", module: "CONN", message: "Connection re-established." },
];

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);
  
  // Simulate live logs
  useEffect(() => {
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('en-GB'),
        level: Math.random() > 0.9 ? "WARN" : "INFO",
        module: Math.random() > 0.5 ? "STRAT" : "SYS",
        message: "Monitoring active positions... No changes required."
      };
      setLogs(prev => [...prev.slice(-49), newLog]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      <div className="z-10 relative">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 overflow-hidden z-10 relative h-screen flex flex-col">
        <header className="mb-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground tracking-wide flex items-center gap-2">
              SYSTEM LOGS <span className="text-muted-foreground">///</span>
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              REAL-TIME EVENT STREAM
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLogs([])}>
              <Trash2 className="w-4 h-4 mr-2" /> Clear
            </Button>
          </div>
        </header>

        <Card className="flex-1 border-border/50 bg-[#0d1117] backdrop-blur-sm overflow-hidden flex flex-col shadow-inner">
          <div className="p-2 border-b border-border/50 bg-card/50 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs..." 
                className="pl-9 h-9 bg-background/50 border-border/50 font-mono text-sm" 
              />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-mono text-muted-foreground hover:text-foreground">
                <Filter className="w-3 h-3 mr-1" /> FILTER
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-mono text-primary hover:text-primary">
                <Terminal className="w-3 h-3 mr-1" /> TAIL -F
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 font-mono text-sm">
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 hover:bg-white/5 p-0.5 rounded px-2 group">
                  <span className="text-muted-foreground opacity-50 w-20 shrink-0">{log.timestamp}</span>
                  <Badge 
                    variant="outline" 
                    className={`w-16 justify-center text-[10px] h-5 border-0 ${
                      log.level === 'INFO' ? 'bg-blue-500/10 text-blue-500' :
                      log.level === 'WARN' ? 'bg-yellow-500/10 text-yellow-500' :
                      log.level === 'ERROR' ? 'bg-red-500/10 text-red-500' :
                      'bg-green-500/10 text-green-500'
                    }`}
                  >
                    {log.level}
                  </Badge>
                  <span className="text-purple-400 w-12 shrink-0 font-bold text-xs pt-0.5">{log.module}</span>
                  <span className="text-foreground/80 group-hover:text-foreground transition-colors break-all">
                    {log.message}
                  </span>
                </div>
              ))}
              <div className="h-4" /> {/* Spacer */}
              <div className="animate-pulse text-primary/50">_</div>
            </div>
          </ScrollArea>
        </Card>
      </main>
    </div>
  );
}