import { Link, useLocation } from "wouter";
import { LayoutDashboard, Activity, Settings, Terminal, Shield, LogOut, Globe, Code, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrokerStatus, useDisconnectBroker } from "@/lib/api";

export function Sidebar() {
  const [location] = useLocation();
  const { data: brokerStatus } = useBrokerStatus();
  const disconnectMutation = useDisconnectBroker();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Activity, label: "Live Trades", href: "/trades" },
    { icon: Code, label: "Strategy", href: "/strategy" },
    { icon: Terminal, label: "Logs", href: "/logs" },
    { icon: Shield, label: "Risk Config", href: "/risk" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="w-16 lg:w-64 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col h-screen sticky top-0">
      <div className="p-4 flex items-center gap-3 border-b border-border/50">
        <div className="w-8 h-8 rounded bg-primary/20 border border-primary flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <span className="font-display font-bold text-xl tracking-wider hidden lg:block text-foreground">
          TRADELOCKER
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,255,128,0.1)]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
              <span className="hidden lg:block font-medium">{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary hidden lg:block shadow-[0_0_5px_var(--color-primary)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50 space-y-2">
        <Link 
          href="/connect"
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 transition-colors rounded-md",
            location === "/connect"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <Plug className="w-5 h-5" />
          <span className="hidden lg:block font-medium">
            {brokerStatus?.connected ? "Broker Connected" : "Connect Broker"}
          </span>
          {brokerStatus?.connected && (
            <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse hidden lg:block" />
          )}
        </Link>

        {brokerStatus?.connected && (
          <button 
            onClick={() => disconnectMutation.mutate()}
            className="flex items-center gap-3 text-destructive hover:text-destructive/80 w-full px-3 py-2 transition-colors"
            disabled={disconnectMutation.isPending}
            data-testid="button-sidebar-disconnect"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Disconnect</span>
          </button>
        )}
      </div>
    </div>
  );
}