/**
 * ForexRateAPI Client Service
 * Provides access to ForexRateAPI for real-time quotes and historical candles
 * Documentation: https://forexrateapi.com/documentation
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

// Timeframe mapping for ForexRateAPI
const TIMEFRAME_MAP: Record<string, string> = {
  '1m': 'M1',
  '5m': 'M5',
  '15m': 'M15',
  '1h': 'H1',
  '4h': 'H4',
  '1d': 'D1',
  '1w': 'W1',
  '1M': 'MN',
};

class ForexRateAPIService {
  private apiKey: string;
  private baseUrl: string;
  private authenticated: boolean = false;

  constructor(apiKey: string, baseUrl: string = 'https://api.forexrateapi.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async authenticate(): Promise<void> {
    try {
      // ForexRateAPI typically uses API key in query parameters or headers
      // We'll test the connection with a simple quote request
      const response = await fetch(`${this.baseUrl}/rates?api_key=${this.apiKey}&pairs=EURUSD`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        this.authenticated = true;
        console.log('[forex-rate-api] Authentication successful');
      } else {
        const error = await response.json();
        throw new Error(`Authentication failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[forex-rate-api] Authentication error:', error);
      throw error;
    }
  }

  async getQuotes(symbols: string[]): Promise<QuoteData[]> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      // ForexRateAPI uses /rates endpoint for current rates
      const response = await fetch(
        `${this.baseUrl}/rates?api_key=${this.apiKey}&pairs=${symbols.join(',')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch quotes: ${response.statusText}`);
      }

      const data = await response.json();
      const quotes: QuoteData[] = [];

      // ForexRateAPI response format: { rates: { "EURUSD": { rate: 1.0850, ... } } }
      if (data.rates) {
        for (const [symbol, quoteData] of Object.entries(data.rates)) {
          const quote = quoteData as any;
          quotes.push({
            symbol,
            bid: quote.bid || quote.rate || 0,
            ask: quote.ask || quote.rate || 0,
            mid: quote.rate || ((quote.bid || 0) + (quote.ask || 0)) / 2,
            timestamp: quote.timestamp || Date.now(),
          });
        }
      }

      return quotes;
    } catch (error) {
      console.error('[forex-rate-api] Error fetching quotes:', error);
      throw error;
    }
  }

  async getCandles(symbol: string, timeframe: string = 'H1', count: number = 200): Promise<CandleData[]> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      // Map timeframe to ForexRateAPI format
      const mappedTimeframe = TIMEFRAME_MAP[timeframe] || timeframe;

      // ForexRateAPI uses /candles endpoint for historical data
      const response = await fetch(
        `${this.baseUrl}/candles?api_key=${this.apiKey}&pair=${symbol}&timeframe=${mappedTimeframe}&limit=${count}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch candles: ${response.statusText}`);
      }

      const data = await response.json();
      
      // ForexRateAPI response format: { candles: [ { time: ..., open: ..., high: ..., low: ..., close: ... } ] }
      if (data.candles && Array.isArray(data.candles)) {
        return data.candles.map((candle: any) => ({
          time: candle.time || candle.timestamp || 0,
          open: candle.open || 0,
          high: candle.high || 0,
          low: candle.low || 0,
          close: candle.close || 0,
        }));
      }

      return [];
    } catch (error) {
      console.error('[forex-rate-api] Error fetching candles:', error);
      throw error;
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      // Note: ForexRateAPI may not support order placement
      // This is a placeholder for potential future implementation
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          ...order,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to place order: ${error.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[forex-rate-api] Error placing order:', error);
      throw error;
    }
  }

  async getOrders(): Promise<any[]> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      // Note: ForexRateAPI may not support order retrieval
      // This is a placeholder for potential future implementation
      const response = await fetch(`${this.baseUrl}/orders?api_key=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[forex-rate-api] Error fetching orders:', error);
      throw error;
    }
  }

  async getAccounts(): Promise<Account[]> {
    if (!this.authenticated) {
      await this.authenticate();
    }

    try {
      // Note: ForexRateAPI may not support account management
      // This is a placeholder for potential future implementation
      const response = await fetch(`${this.baseUrl}/accounts?api_key=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[forex-rate-api] Error fetching accounts:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }
}

// Singleton instance
let forexRateAPIServiceInstance: ForexRateAPIService | null = null;

export function getForexRateAPIService(): ForexRateAPIService {
  if (!forexRateAPIServiceInstance) {
    const apiKey = process.env.FOREX_RATE_API_KEY;
    if (!apiKey) {
      throw new Error('FOREX_RATE_API_KEY is not set in environment variables');
    }
    forexRateAPIServiceInstance = new ForexRateAPIService(apiKey);
  }
  return forexRateAPIServiceInstance;
}

export function clearForexRateAPIService(): void {
  forexRateAPIServiceInstance = null;
}
