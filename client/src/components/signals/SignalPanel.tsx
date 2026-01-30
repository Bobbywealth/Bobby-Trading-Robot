/**
 * SignalPanel Component
 * Main panel for displaying trade signals
 */

import { useState, useEffect } from 'react';
import { SignalCard, type SignalData } from './SignalCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Filter, Signal as SignalIcon } from 'lucide-react';
import { useWebSocket } from '@/lib/websocket';

interface SignalPanelProps {
  onExecute?: (signalId: string) => void;
  onDismiss?: (signalId: string) => void;
  onView?: (signalId: string) => void;
}

export function SignalPanel({ onExecute, onDismiss, onView }: SignalPanelProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'executed' | 'dismissed'>('all');
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  
  const { connected, signals, subscribe } = useWebSocket({
    autoConnect: true,
  });

  // Subscribe to signals
  useEffect(() => {
    subscribe({ type: 'signals' });
  }, [subscribe]);

  const filteredSignals = signals.filter((signal) => {
    if (filter !== 'all' && signal.status !== filter) {
      return false;
    }
    if (symbolFilter && !signal.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const pendingSignals = signals.filter(s => s.status === 'pending' || s.status === 'viewed');
  const executedSignals = signals.filter(s => s.status === 'executed');
  const dismissedSignals = signals.filter(s => s.status === 'dismissed' || s.status === 'expired');

  const handleRefresh = async () => {
    setRefreshing(true);
    // In a real implementation, this would fetch fresh signals from the API
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleExecute = async (signalId: string) => {
    if (onExecute) {
      await onExecute(signalId);
    }
  };

  const handleDismiss = async (signalId: string) => {
    if (onDismiss) {
      await onDismiss(signalId);
    }
  };

  const handleView = async (signalId: string) => {
    if (onView) {
      await onView(signalId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SignalIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Trade Signals</h2>
          <Badge variant={connected ? 'outline' : 'secondary'}>
            {connected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Signals</option>
            <option value="pending">Pending</option>
            <option value="executed">Executed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Filter by symbol..."
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          className="bg-background border border-border rounded-md px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
      </div>

      {/* Signal Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">
            Active ({pendingSignals.length})
          </TabsTrigger>
          <TabsTrigger value="executed">
            Executed ({executedSignals.length})
          </TabsTrigger>
          <TabsTrigger value="dismissed">
            Dismissed ({dismissedSignals.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({signals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {pendingSignals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <SignalIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active signals</p>
            </div>
          ) : (
            pendingSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onExecute={handleExecute}
                onDismiss={handleDismiss}
                onView={handleView}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="executed" className="mt-4 space-y-4">
          {executedSignals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No executed signals</p>
            </div>
          ) : (
            executedSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onExecute={handleExecute}
                onDismiss={handleDismiss}
                onView={handleView}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="dismissed" className="mt-4 space-y-4">
          {dismissedSignals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No dismissed signals</p>
            </div>
          ) : (
            dismissedSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onExecute={handleExecute}
                onDismiss={handleDismiss}
                onView={handleView}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-4">
          {filteredSignals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No signals found</p>
            </div>
          ) : (
            filteredSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onExecute={handleExecute}
                onDismiss={handleDismiss}
                onView={handleView}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
