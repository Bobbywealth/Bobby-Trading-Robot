/**
 * WebSocket Server
 * Manages WebSocket connections for real-time signal and market data updates
 */

import { createServer, type Server as HTTPServer } from "http";
import { WebSocketServer as WS, WebSocket } from "ws";
import type { TradeSignal } from "@shared/schema";

export interface Subscription {
  type: 'signals' | 'market' | 'all';
  symbols?: string[];
  strategies?: string[];
}

export interface ClientInfo {
  id: string;
  ws: WebSocket;
  subscriptions: Subscription;
  lastPing: number;
}

export interface WebSocketServer {
  initialize(server: HTTPServer): void;
  broadcastSignal(signal: TradeSignal): void;
  broadcastSignalUpdate(signalId: string, update: Partial<TradeSignal>): void;
  broadcastMarketData(symbols: string[]): void;
  handleSubscription(clientId: string, subscription: Subscription): void;
}

class WebSocketServerImpl implements WebSocketServer {
  private wss: WS | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private nextClientId = 0;

  initialize(server: HTTPServer): void {
    this.wss = new WS({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = `client_${this.nextClientId++}`;
      
      const clientInfo: ClientInfo = {
        id: clientId,
        ws,
        subscriptions: { type: 'all' },
        lastPing: Date.now(),
      };
      
      this.clients.set(clientId, clientInfo);
      
      console.log(`[websocket] Client connected: ${clientId}`);
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        payload: { clientId },
      });
      
      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (err) {
          console.error(`[websocket] Error parsing message from ${clientId}:`, err);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log(`[websocket] Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });
      
      // Handle errors
      ws.on('error', (err) => {
        console.error(`[websocket] Error for client ${clientId}:`, err);
      });
      
      // Setup heartbeat
      ws.on('pong', () => {
        clientInfo.lastPing = Date.now();
      });
    });

    // Cleanup inactive clients every 30 seconds
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute timeout
      
      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastPing > timeout) {
          console.log(`[websocket] Closing inactive client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
        }
      }
    }, 30000);

    console.log('[websocket] Server initialized');
  }

  broadcastSignal(signal: TradeSignal): void {
    const message = {
      type: 'signal',
      payload: signal,
    };
    
    this.broadcast(message, (client) => {
      return this.shouldSendSignal(client, signal);
    });
    
    console.log(`[websocket] Broadcast signal: ${signal.direction} ${signal.symbol}`);
  }

  broadcastSignalUpdate(signalId: string, update: Partial<TradeSignal>): void {
    const message = {
      type: 'signal_update',
      payload: {
        id: signalId,
        changes: update,
      },
    };
    
    this.broadcast(message);
    console.log(`[websocket] Broadcast signal update: ${signalId}`);
  }

  broadcastMarketData(symbols: string[]): void {
    const message = {
      type: 'market_data',
      payload: { symbols },
    };
    
    this.broadcast(message, (client) => {
      return this.shouldSendMarketData(client, symbols);
    });
  }

  handleSubscription(clientId: string, subscription: Subscription): void {
    const client = this.clients.get(clientId);
    if (!client) {
      console.error(`[websocket] Client not found: ${clientId}`);
      return;
    }
    
    client.subscriptions = subscription;
    console.log(`[websocket] Client ${clientId} subscribed to:`, subscription);
    
    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      payload: subscription,
    });
  }

  private handleMessage(clientId: string, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message.payload);
        break;
      
      case 'unsubscribe':
        // Handle unsubscription
        const client = this.clients.get(clientId);
        if (client) {
          client.subscriptions = { type: 'all' };
          this.sendToClient(clientId, {
            type: 'subscription_confirmed',
            payload: client.subscriptions,
          });
        }
        break;
      
      case 'ping':
        this.sendToClient(clientId, { type: 'pong' });
        break;
      
      default:
        console.warn(`[websocket] Unknown message type: ${message.type}`);
    }
  }

  private broadcast(
    message: any,
    filter?: (client: ClientInfo) => boolean
  ): void {
    const data = JSON.stringify(message);
    
    for (const [clientId, client] of this.clients.entries()) {
      if (filter && !filter(client)) {
        continue;
      }
      
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(data);
        } catch (err) {
          console.error(`[websocket] Error sending to client ${clientId}:`, err);
        }
      }
    }
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      client.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error(`[websocket] Error sending to client ${clientId}:`, err);
    }
  }

  private shouldSendSignal(client: ClientInfo, signal: TradeSignal): boolean {
    const sub = client.subscriptions;
    
    // If subscribed to all, send everything
    if (sub.type === 'all') {
      return true;
    }
    
    // If subscribed to signals
    if (sub.type === 'signals') {
      // If no filters, send all signals
      if (!sub.symbols && !sub.strategies) {
        return true;
      }
      
      // Check symbol filter
      if (sub.symbols && sub.symbols.length > 0) {
        if (!sub.symbols.includes(signal.symbol)) {
          return false;
        }
      }
      
      // Check strategy filter
      if (sub.strategies && sub.strategies.length > 0) {
        if (!sub.strategies.includes(signal.strategyId)) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  private shouldSendMarketData(client: ClientInfo, symbols: string[]): boolean {
    const sub = client.subscriptions;
    
    // If subscribed to all, send everything
    if (sub.type === 'all') {
      return true;
    }
    
    // If subscribed to market data
    if (sub.type === 'market') {
      // If no symbol filters, send all
      if (!sub.symbols || sub.symbols.length === 0) {
        return true;
      }
      
      // Check if any of the symbols match
      return symbols.some(s => sub.symbols!.includes(s));
    }
    
    return false;
  }

  getStatus(): { connectedClients: number; subscriptions: Subscription[] } {
    return {
      connectedClients: this.clients.size,
      subscriptions: Array.from(this.clients.values()).map(c => c.subscriptions),
    };
  }
}

export const wsServer = new WebSocketServerImpl();
