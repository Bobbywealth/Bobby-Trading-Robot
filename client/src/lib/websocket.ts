/**
 * WebSocket Client
 * Manages WebSocket connection for real-time signal and market data updates
 */

import { useEffect, useState, useRef, useCallback } from 'react';

export interface Subscription {
  type: 'signals' | 'market' | 'all';
  symbols?: string[];
  strategies?: string[];
}

export interface SignalData {
  id: string;
  userId: string;
  strategyId: string;
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
  viewedAt?: string;
  executedAt?: string;
  expiresAt?: string;
  orderId?: string;
  pnl?: number;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
}

type WSMessage =
  | { type: 'connected'; payload: { clientId: string } }
  | { type: 'signal'; payload: SignalData }
  | { type: 'signal_update'; payload: { id: string; changes: Partial<SignalData> } }
  | { type: 'market_data'; payload: { symbols: string[] } }
  | { type: 'subscription_confirmed'; payload: Subscription }
  | { type: 'pong' }
  | { type: 'error'; payload: { message: string } };

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onSignal?: (signal: SignalData) => void;
  onSignalUpdate?: (update: { id: string; changes: Partial<SignalData> }) => void;
  onMarketData?: (data: MarketData) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    onSignal,
    onSignalUpdate,
    onMarketData,
    onConnected,
    onDisconnected,
  } = options;

  const [connected, setConnected] = useState(false);
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[websocket] Connected');
        setConnected(true);
        onConnected?.();

        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      wsRef.current.onclose = () => {
        console.log('[websocket] Disconnected');
        setConnected(false);
        onDisconnected?.();

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Attempt to reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[websocket] Attempting to reconnect...');
          connect();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('[websocket] Error:', error);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              console.log('[websocket] Client connected:', message.payload.clientId);
              break;

            case 'signal':
              console.log('[websocket] New signal received:', message.payload);
              setSignals((prev) => [message.payload, ...prev]);
              onSignal?.(message.payload);
              break;

            case 'signal_update':
              console.log('[websocket] Signal update received:', message.payload);
              setSignals((prev) =>
                prev.map((s) =>
                  s.id === message.payload.id
                    ? { ...s, ...message.payload.changes }
                    : s
                )
              );
              onSignalUpdate?.(message.payload);
              break;

            case 'market_data':
              console.log('[websocket] Market data received:', message.payload);
              onMarketData?.(message.payload as any);
              break;

            case 'subscription_confirmed':
              console.log('[websocket] Subscription confirmed:', message.payload);
              break;

            case 'pong':
              // Heartbeat response
              break;

            case 'error':
              console.error('[websocket] Server error:', message.payload);
              break;
          }
        } catch (err) {
          console.error('[websocket] Error parsing message:', err);
        }
      };
    } catch (err) {
      console.error('[websocket] Failed to connect:', err);
    }
  }, [onConnected, onDisconnected, onSignal, onSignalUpdate, onMarketData]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setConnected(false);
  }, []);

  const subscribe = useCallback((subscription: Subscription) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          payload: subscription,
        })
      );
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    signals,
    marketData,
    connect,
    disconnect,
    subscribe,
  };
}

export default useWebSocket;
