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

      const data: AccountsResponse = await response.json();
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
      return data.instruments || data || [];
    } catch (error: any) {
      throw new Error(`Failed to get instruments: ${error.message}`);
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (!this.accessToken || !this.accountNumberRef) {
      throw new Error("Not authenticated or no account selected");
    }

    try {
      const quotes: Quote[] = [];
      const now = Date.now();

      for (const symbol of symbols) {
        const response = await this.fetchWithAccount(
          (ref) => `${this.baseUrl}/backend-api/trade/accounts/${ref}/quotes/${encodeURIComponent(symbol)}`,
          "GET",
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `Quote request failed for ${symbol}: ${response.status} ${response.statusText} ${text}`.trim()
          );
        }

        const data = await response.json();
        const bid = data.bid ?? data.b;
        const ask = data.ask ?? data.a;
        const s = data.s ?? data.symbol ?? symbol;

        if (typeof bid !== "number" || typeof ask !== "number") {
          throw new Error(`Quote payload missing bid/ask for ${symbol}: ${JSON.stringify(data)}`);
        }

        quotes.push({
          s,
          bid,
          ask,
          timestamp: now,
        });
      }

      return quotes;
    } catch (error: any) {
      throw new Error(`Failed to get quotes: ${error.message}`);
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
      const response = await this.fetchWithAccount(
        (ref) => `${this.baseUrl}/backend-api/trade/accounts/${ref}/orders`,
        "POST",
        {
          instrumentId: order.instrumentId,
          qty: order.qty,
          side: order.side,
          type: order.type,
          price: order.price,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to place order: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return {
        orderId: data.orderId || data.id,
        status: data.status || "submitted",
        message: data.message,
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
