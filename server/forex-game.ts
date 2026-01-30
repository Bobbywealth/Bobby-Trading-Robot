/**
 * Forex.game API Client Service
 * Provides access to Forex.game API for real-time quotes, historical candles, and order execution
 */

export interface QuoteData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderResult {
  orderId: string;
  status: 'pending' | 'filled' | 'rejected' | 'cancelled';
  message?: string;
}

export interface Account {
  accountId: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
}

class ForexGameService {
  private apiKey: string;
  private baseUrl: string;
  private authenticated: boolean = false;

  constructor(apiKey: string, baseUrl: string = 'https://demo.forex.game/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (response.ok) {
        this.authenticated = true;
        console.log('[forex-game] Authentication successful');
      } else {
        const error = await response.json();
        throw new Error(`Authentication failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[forex-game] Authentication error:', error);
      throw error;
    }
  }

  async getQuotes(symbols: string[]): Promise<QuoteData[]> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/quotes?pairs=${symbols.join(',')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quotes: ${response.statusText}`);
      }

      const data = await response.json();
      const quotes: QuoteData[] = [];

      for (const [symbol, quote] of Object.entries(data)) {
        quotes.push({
          symbol,
          bid: quote.bid,
          ask: quote.ask,
          mid: (quote.bid + quote.ask) / 2,
          timestamp: Date.now(),
        });
      }

      return quotes;
    } catch (error) {
      console.error('[forex-game] Error fetching quotes:', error);
      throw error;
    }
  }

  async getCandles(symbol: string, timeframe: string = 'H1', count: number = 200): Promise<CandleData[]> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/candles?symbol=${symbol}&timeframe=${timeframe}&count=${count}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch candles: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candles || [];
    } catch (error) {
      console.error('[forex-game] Error fetching candles:', error);
      throw error;
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to place order: ${error.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[forex-game] Error placing order:', error);
      throw error;
    }
  }

  async getOrders(): Promise<any[]> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[forex-game] Error fetching orders:', error);
      throw error;
    }
  }

  async getAccounts(): Promise<Account[]> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/accounts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[forex-game] Error fetching accounts:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }
}

// Singleton instance
let forexGameServiceInstance: ForexGameService | null = null;

export function getForexGameService(): ForexGameService {
  if (!forexGameServiceInstance) {
    const apiKey = process.env.FOREX_GAME_API_KEY;
    if (!apiKey) {
      throw new Error('FOREX_GAME_API_KEY is not set in environment variables');
    }
    forexGameServiceInstance = new ForexGameService(apiKey);
  }
  return forexGameServiceInstance;
}

export function clearForexGameService(): void {
  forexGameServiceInstance = null;
}
