import { Sidebar } from "@/components/trading/Sidebar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Trash2, Filter, Terminal } from "lucide-react";
import { useState } from "react";
import { useSystemLogs } from "@/lib/api";
import { format } from "date-fns";

export default function LogsPage() {
  const { data: logs = [], isLoading } = useSystemLogs(100);
  const [searchTerm, setSearchTerm] = useState("");

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
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Badge variant="secondary" className="font-mono" data-testid="badge-log-count">
              {logs.length} LOGS
            </Badge>
          </div>
        </header>

        <Card className="flex-1 border-border/50 bg-[#0d1117] backdrop-blur-sm overflow-hidden flex flex-col shadow-inner">
          <div className="p-2 border-b border-border/50 bg-card/50 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs..." 
                className="pl-9 h-9 bg-background/50 border-border/50 font-mono text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
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
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">
                Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-logs">
                No logs yet
              </div>
            ) : (
              <div className="space-y-1">
                {logs
                  .filter(log => 
                    searchTerm === "" || 
                    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.level.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((log) => (
                    <div key={log.id} className="flex items-start gap-3 hover:bg-white/5 p-0.5 rounded px-2 group" data-testid={`log-entry-${log.id}`}>
                      <span className="text-muted-foreground opacity-50 w-20 shrink-0" data-testid={`text-timestamp-${log.id}`}>
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`w-16 justify-center text-[10px] h-5 border-0 ${
                          log.level === 'info' ? 'bg-blue-500/10 text-blue-500' :
                          log.level === 'warn' ? 'bg-yellow-500/10 text-yellow-500' :
                          log.level === 'error' ? 'bg-red-500/10 text-red-500' :
                          'bg-green-500/10 text-green-500'
                        }`}
                        data-testid={`badge-level-${log.id}`}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-purple-400 w-12 shrink-0 font-bold text-xs pt-0.5" data-testid={`text-module-${log.id}`}>{log.module}</span>
                      <span className="text-foreground/80 group-hover:text-foreground transition-colors break-all" data-testid={`text-message-${log.id}`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                <div className="h-4" />
                <div className="animate-pulse text-primary/50">_</div>
              </div>
            )}
          </ScrollArea>
        </Card>
      </main>
    </div>
  );
}