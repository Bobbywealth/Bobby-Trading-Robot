/**
 * SignalCard Component
 * Displays individual trade signal with actions
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';

export interface SignalData {
  id: string;
  strategyName: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  reasoning: string;
  indicators?: any;
  timeframe: string;
  timestamp: string;
  status: 'pending' | 'viewed' | 'executed' | 'dismissed' | 'expired';
  executedAt?: string;
  expiresAt?: string;
}

interface SignalCardProps {
  signal: SignalData;
  onExecute?: (signalId: string) => void;
  onDismiss?: (signalId: string) => void;
  onView?: (signalId: string) => void;
}

export function SignalCard({ signal, onExecute, onDismiss, onView }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (onExecute) {
      setIsExecuting(true);
      try {
        await onExecute(signal.id);
      } finally {
        setIsExecuting(false);
      }
    }
  };

  const handleDismiss = async () => {
    if (onDismiss) {
      await onDismiss(signal.id);
    }
  };

  const handleView = async () => {
    if (onView) {
      await onView(signal.id);
    }
  };

  const isPending = signal.status === 'pending' || signal.status === 'viewed';
  const canExecute = isPending && !isExecuting;
  const canDismiss = isPending;

  const timeSince = getTimeSince(new Date(signal.timestamp));
  const expiresIn = signal.expiresAt ? getTimeUntil(new Date(signal.expiresAt)) : null;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getDirectionIcon = () => {
    if (signal.direction === 'buy') {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    }
    return <TrendingDown className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = () => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      viewed: 'outline',
      executed: 'default',
      dismissed: 'secondary',
      expired: 'destructive',
    };
    return (
      <Badge variant={variants[signal.status] || 'secondary'}>
        {signal.status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="border-border/50 hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getDirectionIcon()}
            <div>
              <CardTitle className="text-lg font-semibold">
                {signal.symbol} <span className="text-muted-foreground font-normal text-sm">
                  ({signal.timeframe})
                </span>
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {signal.strategyName} • {timeSince}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${getConfidenceColor(signal.confidence)}`}>
              {signal.confidence}%
            </div>
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Trading Info */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground uppercase">Entry</div>
            <div className="text-lg font-mono font-semibold">{signal.entryPrice.toFixed(2)}</div>
          </div>
          {signal.stopLoss && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase">Stop Loss</div>
              <div className="text-lg font-mono font-semibold text-red-500">
                {signal.stopLoss.toFixed(2)}
              </div>
            </div>
          )}
          {signal.takeProfit && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase">Take Profit</div>
              <div className="text-lg font-mono font-semibold text-green-500">
                {signal.takeProfit.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Expiration */}
        {expiresIn && isPending && (
          <div className="text-sm text-center text-muted-foreground">
            Expires in {expiresIn}
          </div>
        )}

        {/* Reasoning - Collapsible */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setExpanded(!expanded)}
            >
              <span>View Analysis</span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">Analysis & Reasoning</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {signal.reasoning}
              </div>
            </div>

            {signal.indicators && Object.keys(signal.indicators).length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm font-medium mb-2">Technical Indicators</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(signal.indicators).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        {isPending && (
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1"
              disabled={!canExecute}
              onClick={handleExecute}
            >
              {isExecuting ? 'Executing...' : 'Execute Trade'}
            </Button>
            <Button
              variant="outline"
              disabled={!canDismiss}
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          </div>
        )}

        {signal.status === 'executed' && signal.executedAt && (
          <div className="text-center text-sm text-muted-foreground">
            Executed {getTimeSince(new Date(signal.executedAt))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getTimeUntil(date: Date): string {
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
