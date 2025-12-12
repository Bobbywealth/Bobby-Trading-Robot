import { Link } from "wouter";
import { Sidebar } from "@/components/trading/Sidebar";
import { MarketChart } from "@/components/trading/MarketChart";
import { ActiveTrades } from "@/components/trading/ActiveTrades";
import { BotControls } from "@/components/trading/BotControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBrokerStatus, useBrokerAccounts } from "@/lib/api";
import generatedImage from '@assets/generated_images/dark_futuristic_digital_trading_background_with_neon_data_streams.png';

const LOGO_URL = "https://iili.io/f7qxA7f.png";

export default function Dashboard() {
  const { data: status } = useBrokerStatus();
  const isConnected = status?.connected && status?.accountNumber;
  const { data: accounts } = useBrokerAccounts(Boolean(isConnected));

  const accountSummary = accounts?.find((a) =>
    String(a.accNum ?? a.id ?? a.accountNumber) === String(status?.accountNumber),
  );
  const balance = accountSummary?.balance ?? accountSummary?.accountBalance;
  const equity = accountSummary?.equity ?? accountSummary?.accountEquity;

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Sidebar */}
      <div className="z-10 relative">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto z-10 relative h-screen">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={LOGO_URL}
                alt="TradeLocker Logo"
                className="w-10 h-10 rounded-full border border-primary/50 shadow-[0_0_12px_rgba(0,255,128,0.25)]"
                loading="lazy"
              />
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground tracking-wide">
                  DASHBOARD <span className="text-primary">///</span>
                </h1>
                <p className="text-muted-foreground text-sm font-mono">
                  SYSTEM: ONLINE | SERVER: TL-LIVE-04
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
              <Badge variant={isConnected ? "outline" : "secondary"} className={isConnected ? "border-primary/40 text-primary bg-primary/10" : "bg-muted text-muted-foreground"}>
                {isConnected ? "Broker: Connected" : "Broker: Not connected"}
              </Badge>
              <p className="text-xs text-muted-foreground font-mono">
                {isConnected ? `Account #${status?.accountNumber}` : "Live trading paused"}
              </p>
            </div>
            <div className="h-8 w-[1px] bg-border/50 mx-2" />
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Balance</div>
              <div className="text-lg font-mono font-bold text-foreground">
                {balance != null ? balance.toLocaleString() : "--"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Equity</div>
              <div className="text-lg font-mono font-bold text-accent glow-text-accent">
                {equity != null ? equity.toLocaleString() : "--"}
              </div>
            </div>
            {!isConnected && (
              <Button asChild size="sm" className="bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,128,0.15)]">
                <Link href="/connect">Connect now</Link>
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
          {/* Left Column - Charts & Tables */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full">
            <div className="flex-1 min-h-[300px]">
              <MarketChart />
            </div>
            <div className="flex-1 min-h-[250px]">
              <ActiveTrades />
            </div>
          </div>

          {/* Right Column - Controls */}
          <div className="lg:col-span-4 h-full overflow-y-auto pb-6">
            <BotControls />
          </div>
        </div>
      </main>
    </div>
  );
}