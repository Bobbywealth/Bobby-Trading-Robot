import { Sidebar } from "@/components/trading/Sidebar";
import { StrategyEditor } from "@/components/trading/StrategyEditor";
import generatedImage from '@assets/generated_images/dark_futuristic_digital_trading_background_with_neon_data_streams.png';

export default function StrategyPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-5 pointer-events-none"
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
        <header className="mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground tracking-wide flex items-center gap-2">
              STRATEGY COMPILER <span className="text-accent">///</span>
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              BUILD V2.1 | MODE: EDITING
            </p>
        </header>

        <div className="h-[calc(100vh-140px)]">
          <StrategyEditor />
        </div>
      </main>
    </div>
  );
}