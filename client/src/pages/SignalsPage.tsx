/**
 * Signals Page
 * Main page for viewing and managing trade signals
 */

import { Sidebar } from "@/components/trading/Sidebar";
import { SignalPanel } from "@/components/signals/SignalPanel";
import { Button } from "@/components/ui/button";
import { Play, Square, Settings } from "lucide-react";
import { useState } from "react";
import generatedImage from '@assets/generated_images/dark_futuristic_digital_trading_background_with_neon_data_streams.png';

export default function SignalsPage() {
  const [engineRunning, setEngineRunning] = useState(false);

  const handleExecuteSignal = async (signalId: string) => {
    try {
      const response = await fetch(`/api/signals/${signalId}/execute`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to execute signal: ${error.error || error.details}`);
      }
    } catch (error) {
      console.error('Error executing signal:', error);
      alert('Failed to execute signal');
    }
  };

  const handleDismissSignal = async (signalId: string) => {
    try {
      const response = await fetch(`/api/signals/${signalId}/dismiss`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to dismiss signal: ${error.error}`);
      }
    } catch (error) {
      console.error('Error dismissing signal:', error);
      alert('Failed to dismiss signal');
    }
  };

  const handleViewSignal = async (signalId: string) => {
    try {
      const response = await fetch(`/api/signals/${signalId}/view`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error viewing signal:', error);
      }
    } catch (error) {
      console.error('Error viewing signal:', error);
    }
  };

  const handleStartEngine = async () => {
    try {
      const response = await fetch('/api/signals/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyIds: [], // Add your strategy IDs here
          symbols: ['XAUUSD', 'EURUSD', 'GBPUSD'],
          mode: 'realtime',
          intervalMs: 1000,
          dryRun: true,
        }),
      });
      
      if (response.ok) {
        setEngineRunning(true);
      } else {
        const error = await response.json();
        alert(`Failed to start engine: ${error.error || error.details}`);
      }
    } catch (error) {
      console.error('Error starting engine:', error);
      alert('Failed to start signal engine');
    }
  };

  const handleStopEngine = async () => {
    try {
      const response = await fetch('/api/signals/stop', {
        method: 'POST',
      });
      
      if (response.ok) {
        setEngineRunning(false);
      } else {
        const error = await response.json();
        alert(`Failed to stop engine: ${error.error}`);
      }
    } catch (error) {
      console.error('Error stopping engine:', error);
      alert('Failed to stop signal engine');
    }
  };

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
            <h1 className="text-2xl font-display font-bold text-foreground tracking-wide flex items-center gap-2">
              TRADE SIGNALS <span className="text-accent">///</span>
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              ENGINE: {engineRunning ? 'RUNNING' : 'STOPPED'} | MODE: REALTIME
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Navigate to settings
                window.location.href = '/settings';
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            {!engineRunning ? (
              <Button
                size="sm"
                onClick={handleStartEngine}
                className="bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,128,0.15)]"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Engine
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopEngine}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Engine
              </Button>
            )}
          </div>
        </header>

        <div className="h-[calc(100vh-140px)]">
          <SignalPanel
            onExecute={handleExecuteSignal}
            onDismiss={handleDismissSignal}
            onView={handleViewSignal}
          />
        </div>
      </main>
    </div>
  );
}
