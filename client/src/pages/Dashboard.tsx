import { Sidebar } from "@/components/trading/Sidebar";
import { MarketChart } from "@/components/trading/MarketChart";
import { ActiveTrades } from "@/components/trading/ActiveTrades";
import { BotControls } from "@/components/trading/BotControls";
import generatedImage from '@assets/generated_images/dark_futuristic_digital_trading_background_with_neon_data_streams.png';

export default function Dashboard() {
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
            <h1 className="text-2xl font-display font-bold text-foreground tracking-wide">
              DASHBOARD <span className="text-primary">///</span>
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              SYSTEM: ONLINE | SERVER: TL-LIVE-04
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Profit</div>
              <div className="text-xl font-mono font-bold text-primary glow-text-primary">+$1,240.50</div>
            </div>
            <div className="h-8 w-[1px] bg-border/50 mx-2" />
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Daily Gain</div>
              <div className="text-xl font-mono font-bold text-accent glow-text-accent">+2.4%</div>
            </div>
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