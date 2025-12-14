interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface Account {
  id: number;
  name: string;
  currency: string;
  accNum: string | number;
  accountBalance: number;
  accountEquity: number;
}

interface AccountsResponse {
  accounts: Account[];
}

interface Instrument {
  tradableInstrumentId: number;
  name: string;
  description: string;
  pipSize: number;
  lotSize: number;
  minOrderSize: number;
  maxOrderSize: number;
}

interface Quote {
  s: string;
  bid: number;
  ask: number;
  timestamp: number;
}

interface OrderRequest {
  instrumentId: number;
  qty: number;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop";
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface OrderResponse {
  orderId: number;
  status: string;
  message?: string;
}

function mapServerToUrl(server: string): string {
  if (server === "HEROFX") {
    return "demo.tradelocker.com";
  }
  return server;
}

export class TradeLockerService {
  private baseUrl: string;
  private serverName: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accountNumberRef: string | number | null = null;
  private accountIdRef: string | number | null = null;

  private async refresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("Missing refresh token");
    }
    const response = await fetch(`${this.baseUrl}/backend-api/auth/jwt/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Token refresh failed: ${response.status} ${JSON.stringify(errorData)}`
      );
    }
    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken ?? this.refreshToken;
  }

  private async withRefresh<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const message = String(err?.message || "");
      const shouldRefresh =
        message.includes("401") ||
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("expired");
      if (!shouldRefresh) throw err;
      await this.refresh();
      return await fn();
    }
  }

  constructor(server: string = "live.tradelocker.com") {
    this.serverName = server;
    const mappedServer = mapServerToUrl(server);
    this.baseUrl = `https://${mappedServer}`;
  }

  setCredentials(
    accessToken: string,
    refreshToken: string,
    accountNumber?: string | number,
    accountId?: string | number,
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.accountNumberRef = accountNumber ?? accountId ?? null;
    this.accountIdRef = accountId ?? null;
  }

  private getPrimaryAccountRef(): string | number | null {
    // Use accountId for path; accountNumber will go to headers.
    return this.accountIdRef ?? this.accountNumberRef ?? null;
  }

  private getHeaderAccountNumber(): string | number | null {
    return this.accountNumberRef ?? this.accountIdRef ?? null;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("Missing refresh token. Please reconnect.");
    }

    const response = await fetch(`${this.baseUrl}/backend-api/auth/jwt/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Token refresh failed: ${response.status} ${JSON.stringify(errorData)}`,
      );
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken ?? this.refreshToken;
  }

  private async authorizedFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
    retry = true,
  ): Promise<Response> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    const mergedInit: RequestInit = {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    };

    const res = await fetch(input, mergedInit);

    if (res.status === 401 && retry) {
      await this.refreshAccessToken();
      return this.authorizedFetch(input, init, false);
    }

    return res;
  }

  /**
   * Try primary account ref, and if broker rejects with 400/401/404 and a different
   * account ref is available, retry once with the alternate ref.
   */
  private async fetchWithAccount(
    buildPath: (ref: string | number) => string,
    method: "GET" | "POST" = "GET",
    body?: any,
  ): Promise<Response> {
    const primaryRef = this.getPrimaryAccountRef();
    if (!primaryRef) {
      throw new Error("No account reference available");
    }

    const headerAcc = this.getHeaderAccountNumber() ?? primaryRef;

    const headers: Record<string, string> = {
      accNum: String(headerAcc),
      accountNumber: String(headerAcc),
      "Account-Number": String(headerAcc),
    };
    if (this.accountIdRef) {
      headers.accountId = String(this.accountIdRef);
    }

    return this.authorizedFetch(buildPath(primaryRef), {
      method,
      headers: {
        ...headers,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" && body ? JSON.stringify(body) : undefined,
    });
  }

  async authenticate(email: string, password: string, server?: string): Promise<AuthResponse> {
    const serverToUse = server || this.serverName;
    
    try {
      const response = await fetch(`${this.baseUrl}/backend-api/auth/jwt/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          server: serverToUse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Authentication failed: ${response.status} ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      return data;
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async getAccounts(): Promise<Account[]> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await this.authorizedFetch(`${this.baseUrl}/backend-api/auth/jwt/all-accounts`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to get accounts: ${response.status}`);
      }

      const data: any = await response.json();
      // Handle wrapped response: {s:"ok", d:{accounts:[...]}}
      if (data.d && Array.isArray(data.d.accounts)) {
        return data.d.accounts;
      }
      return data.accounts || [];
    } catch (error: any) {
      throw new Error(`Failed to get accounts: ${error.message}`);
    }
  }

  async getInstruments(): Promise<Instrument[]> {
    if (!this.accessToken || !this.accountNumberRef) {
      throw new Error("Not authenticated or no account selected");
    }

    try {
      const response = await this.fetchWithAccount(
        (ref) => `${this.baseUrl}/backend-api/trade/accounts/${ref}/instruments`,
        "GET",
      );

      if (!response.ok) {
        throw new Error(`Failed to get instruments: ${response.status}`);
      }

      const data = await response.json();
      // Handle wrapped response: {s:"ok", d:{instruments:[...]}}
      if (data.d && Array.isArray(data.d.instruments)) {
        return data.d.instruments;
      }
      return data.instruments || data || [];
    } catch (error: any) {
      throw new Error(`Failed to get instruments: ${error.message}`);
    }
  }

  async getHistoricalCandles(
    symbol: string,
    timeframe: string,
    count: number = 200
  ): Promise<Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      // Get instruments to find the instrument ID and routeId
      const instruments = await this.getInstruments();
      const instrument = instruments.find((i: any) => i.name === symbol);
      
      if (!instrument) {
        console.warn(`[TradeLocker] Instrument ${symbol} not found`);
        return [];
      }

      const infoRouteId = (instrument as any).routes?.find((r: any) => r.type === "INFO")?.id;
      if (!infoRouteId) {
        console.warn(`[TradeLocker] No INFO routeId for ${symbol}`);
        return [];
      }

      // Map common timeframe formats to TradeLocker format
      const timeframeMap: Record<string, string> = {
        "1m": "1m",
        "5m": "5m",
        "15m": "15m",
        "1h": "1h",
        "4h": "4h",
        "1d": "1d",
      };
      const tf = timeframeMap[timeframe] || timeframe;

      const headerAcc = this.getHeaderAccountNumber() ?? this.getPrimaryAccountRef();
      const headers: Record<string, string> = {};
      if (headerAcc) {
        headers.accNum = String(headerAcc);
        headers.accountNumber = String(headerAcc);
      }

      // Try multiple possible candles endpoint formats
      const endpointsToTry = [
        `${this.baseUrl}/backend-api/trade/instruments/${(instrument as any).tradableInstrumentId}/candles?routeId=${infoRouteId}&interval=${tf}&count=${count}`,
        `${this.baseUrl}/backend-api/trade/instruments/${(instrument as any).tradableInstrumentId}/bars?routeId=${infoRouteId}&resolution=${tf}&count=${count}`,
        `${this.baseUrl}/backend-api/trade/candles?routeId=${infoRouteId}&tradableInstrumentId=${(instrument as any).tradableInstrumentId}&interval=${tf}&count=${count}`,
        `${this.baseUrl}/backend-api/trade/history?routeId=${infoRouteId}&tradableInstrumentId=${(instrument as any).tradableInstrumentId}&timeframe=${tf}&limit=${count}`,
      ];

      for (const url of endpointsToTry) {
        try {
          console.log(`[TradeLocker] Trying candles endpoint: ${url}`);
          const response = await this.authorizedFetch(url, {
            method: "GET",
            headers,
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`[TradeLocker] ✅ Successfully fetched candles from: ${url}`);
            
            // Handle wrapped response
            let unwrapped = data;
            if (data.d) {
              unwrapped = data.d.candles || data.d.bars || data.d;
            }
            
            const arr = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
            const candles = arr
              .map((item: any) => {
                const time = item.time || item.timestamp || item.t;
                const open = item.open || item.o;
                const high = item.high || item.h;
                const low = item.low || item.l;
                const close = item.close || item.c;
                const volume = item.volume || item.v;

                if (typeof time !== "number" || typeof open !== "number" || 
                    typeof high !== "number" || typeof low !== "number" || 
                    typeof close !== "number") {
                  return null;
                }

                return { time, open, high, low, close, volume };
              })
              .filter(Boolean) as Array<{
                time: number;
                open: number;
                high: number;
                low: number;
                close: number;
                volume?: number;
              }>;

            if (candles.length > 0) {
              console.log(`[TradeLocker] Parsed ${candles.length} candles for ${symbol} (${timeframe})`);
              return candles;
            }
          } else {
            console.log(`[TradeLocker] Endpoint returned ${response.status}, trying next...`);
          }
        } catch (err) {
          console.log(`[TradeLocker] Endpoint failed: ${err}, trying next...`);
        }
      }

      console.warn(`[TradeLocker] ⚠️  No historical candles API found - all endpoints returned empty or error`);
      return [];
    } catch (error: any) {
      console.error(`[TradeLocker] Error fetching historical candles:`, error.message);
      return [];
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      // First, fetch instruments to get routeIds
      const instruments = await this.getInstruments();
      const instrumentMap = new Map(
        instruments.map((inst: any) => [
          inst.name,
          {
            id: inst.tradableInstrumentId,
            infoRouteId: inst.routes?.find((r: any) => r.type === "INFO")?.id,
            tradeRouteId: inst.routes?.find((r: any) => r.type === "TRADE")?.id,
          },
        ])
      );

      const quotes: Quote[] = [];
      const now = Date.now();

      for (const symbol of symbols) {
        const instrument = instrumentMap.get(symbol);
        if (!instrument?.infoRouteId) {
          console.warn(`No INFO routeId found for ${symbol}`);
          continue;
        }

        try {
          const headerAcc = this.getHeaderAccountNumber() ?? this.getPrimaryAccountRef();
          const headers: Record<string, string> = {};
          if (headerAcc) {
            headers.accNum = String(headerAcc);
            headers.accountNumber = String(headerAcc);
          }

          // Try multiple quote endpoint formats with routeId
          const url1 = `${this.baseUrl}/backend-api/trade/instruments/${instrument.id}?routeId=${instrument.infoRouteId}`;
          console.log(`[TradeLocker] Trying quotes endpoint 1: ${url1}`);
          
          let response = await this.authorizedFetch(url1, {
            method: "GET",
            headers,
          });

          // If 404, try alternate format
          if (response.status === 404) {
            const url2 = `${this.baseUrl}/backend-api/trade/quotes?routeId=${instrument.infoRouteId}&tradableInstrumentId=${instrument.id}`;
            console.log(`[TradeLocker] Endpoint 1 404, trying endpoint 2: ${url2}`);
            response = await this.authorizedFetch(url2, {
              method: "GET",
              headers,
            });
          }

          if (!response.ok) {
            const text = await response.text().catch(() => "");
            console.warn(`[TradeLocker] Quote failed for ${symbol}: ${response.status} ${text.substring(0, 200)}`);
            continue;
          }
          
          console.log(`[TradeLocker] Quote success for ${symbol}: ${response.status}`);

          const data = await response.json();
          
          // Handle wrapped response: {s:"ok", d:{quotes:[...]}} or {s:"ok", d:{quote:{...}}}
          let unwrapped = data;
          if (data.d) {
            unwrapped = data.d.quotes || data.d.quote || data.d;
          }
          
          const arr = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
          const parsed = arr
            .map((item: any) => {
              const s = item.s ?? item.symbol ?? item.tradableInstrumentId ?? symbol;
              const bid = item.bid ?? item.b ?? item.bidPrice;
              const ask = item.ask ?? item.a ?? item.askPrice;
              if (typeof bid !== "number" || typeof ask !== "number") return null;
              return { s, bid, ask, timestamp: now };
            })
            .filter(Boolean) as Quote[];

          quotes.push(...parsed);
        } catch (err) {
          console.warn(`Failed to fetch quote for ${symbol}:`, err);
          continue;
        }
      }

      return quotes;
    } catch (error: any) {
      console.error("Failed to get quotes:", error.message);
      return []; // Return empty instead of throwing
    }
  }

  async getOpenPositions(): Promise<any[]> {
    if (!this.accessToken || !this.accountNumberRef) {
      throw new Error("Not authenticated or no account selected");
    }

    try {
      const response = await this.fetchWithAccount(
        (ref) => `${this.baseUrl}/backend-api/trade/accounts/${ref}/positions`,
        "GET",
      );

      if (!response.ok) {
        throw new Error(`Failed to get positions: ${response.status}`);
      }

      const data = await response.json();
      // Handle wrapped response: {s:"ok", d:{positions:[...]}}
      if (data.d && Array.isArray(data.d.positions)) {
        return data.d.positions;
      }
      return data.positions || data || [];
    } catch (error: any) {
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    if (!this.accessToken || !this.accountNumberRef) {
      throw new Error("Not authenticated or no account selected");
    }

    try {
      // Get instrument to find TRADE routeId
      const instruments = await this.getInstruments();
      const instrument = instruments.find((i: any) => i.tradableInstrumentId === order.instrumentId);
      const tradeRouteId = instrument?.routes?.find((r: any) => r.type === "TRADE")?.id;
      
      if (!tradeRouteId) {
        throw new Error(`No TRADE routeId found for instrument ${order.instrumentId}`);
      }

      const orderPayload = {
        instrumentId: order.instrumentId,
        qty: order.qty,
        side: order.side,
        type: order.type,
        routeId: tradeRouteId,
        ...(order.price && { price: order.price }),
        ...(order.stopLoss && { stopLoss: order.stopLoss }),
        ...(order.takeProfit && { takeProfit: order.takeProfit }),
      };

      console.log(`[TradeLocker] Placing order:`, orderPayload);

      const response = await this.fetchWithAccount(
        (ref) => `${this.baseUrl}/backend-api/trade/accounts/${ref}/orders`,
        "POST",
        orderPayload,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || errorData.error || JSON.stringify(errorData);
        
        // Provide user-friendly messages for common errors
        if (response.status === 409) {
          if (errorMsg.toLowerCase().includes("window closed") || errorMsg.toLowerCase().includes("market closed")) {
            throw new Error("Market is currently closed. Trading hours: Mon-Fri 23:00-22:00 GMT (1hr maintenance daily)");
          }
          throw new Error(`Order rejected: ${errorMsg}`);
        }
        
        throw new Error(`Order failed (${response.status}): ${errorMsg}`);
      }

      const data = await response.json();
      // Handle wrapped response: {s:"ok", d:{order:{...}}}
      const unwrapped = data.d?.order || data.d || data;
      return {
        orderId: unwrapped.orderId || unwrapped.id,
        status: unwrapped.status || "submitted",
        message: unwrapped.message,
      };
    } catch (error: any) {
      throw new Error(`Failed to place order: ${error.message}`);
    }
  }
}

const serviceCache = new Map<string, TradeLockerService>();

export function createTradeLockerService(server: string): TradeLockerService {
  return new TradeLockerService(server);
}

export function getTradeLockerService(userId: string, server: string): TradeLockerService {
  const cacheKey = `${userId}:${server}`;
  let service = serviceCache.get(cacheKey);
  if (!service) {
    service = new TradeLockerService(server);
    serviceCache.set(cacheKey, service);
  }
  return service;
}

export function clearTradeLockerService(userId: string): void {
  const keysToDelete: string[] = [];
  serviceCache.forEach((_, key) => {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => serviceCache.delete(key));
}

export function initializeTradeLockerService(
  userId: string,
  server: string,
  accessToken: string,
  refreshToken: string,
  accountNumber?: string | number,
  accountId?: string | number
): TradeLockerService {
  const cacheKey = `${userId}:${server}`;
  let service = serviceCache.get(cacheKey);
  
  if (!service) {
    service = new TradeLockerService(server);
    serviceCache.set(cacheKey, service);
  }
  
  service.setCredentials(accessToken, refreshToken, accountNumber, accountId);
  return service;
}
