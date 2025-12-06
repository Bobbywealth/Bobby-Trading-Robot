interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface Account {
  id: number;
  name: string;
  currency: string;
  accNum: number;
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

export class TradeLockerService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accNum: number | null = null;

  constructor(server: string = "live.tradelocker.com") {
    this.baseUrl = `https://${server}`;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  setAccount(accNum: number) {
    this.accNum = accNum;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TradeLocker API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async authenticate(
    email: string,
    password: string,
    server: string
  ): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/jwt/token", {
      method: "POST",
      body: JSON.stringify({ email, password, server }),
    });

    this.accessToken = response.accessToken;
    this.refreshToken = response.refreshToken;

    return response;
  }

  async refreshAccessToken(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${this.baseUrl}/auth/jwt/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data: AuthResponse = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;

    return data;
  }

  async getAccounts(): Promise<Account[]> {
    const response = await this.request<AccountsResponse>(
      "/auth/jwt/all-accounts"
    );
    return response.accounts;
  }

  async getInstruments(): Promise<Instrument[]> {
    if (!this.accNum) {
      throw new Error("Account not selected");
    }

    const response = await this.request<{ d: { instruments: Instrument[] } }>(
      `/trade/instruments/${this.accNum}`
    );
    return response.d.instruments;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (!this.accNum) {
      throw new Error("Account not selected");
    }

    const symbolsParam = symbols.join(",");
    const response = await this.request<{ d: { quotes: Quote[] } }>(
      `/trade/quotes/${this.accNum}?symbols=${encodeURIComponent(symbolsParam)}`
    );
    return response.d.quotes;
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const quotes = await this.getQuotes([symbol]);
    return quotes.length > 0 ? quotes[0] : null;
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    if (!this.accNum) {
      throw new Error("Account not selected");
    }

    const response = await this.request<OrderResponse>(
      `/trade/orders/${this.accNum}`,
      {
        method: "POST",
        body: JSON.stringify(order),
      }
    );

    return response;
  }

  async getOpenPositions(): Promise<any[]> {
    if (!this.accNum) {
      throw new Error("Account not selected");
    }

    const response = await this.request<{ d: { positions: any[] } }>(
      `/trade/positions/${this.accNum}`
    );
    return response.d.positions;
  }

  async getOpenOrders(): Promise<any[]> {
    if (!this.accNum) {
      throw new Error("Account not selected");
    }

    const response = await this.request<{ d: { orders: any[] } }>(
      `/trade/orders/${this.accNum}`
    );
    return response.d.orders;
  }

  async closePosition(positionId: number): Promise<any> {
    if (!this.accNum) {
      throw new Error("Account not selected");
    }

    const response = await this.request<any>(
      `/trade/positions/${this.accNum}/${positionId}`,
      {
        method: "DELETE",
      }
    );

    return response;
  }

  async cancelOrder(orderId: number): Promise<any> {
    if (!this.accNum) {
      throw new Error("Account not selected");
    }

    const response = await this.request<any>(
      `/trade/orders/${this.accNum}/${orderId}`,
      {
        method: "DELETE",
      }
    );

    return response;
  }

  async getAccountInfo(): Promise<Account | null> {
    const accounts = await this.getAccounts();
    if (this.accNum) {
      return accounts.find((a) => a.accNum === this.accNum) || null;
    }
    return accounts[0] || null;
  }

  async getHistoricalBars(
    instrumentId: number,
    resolution: string = "1H",
    from?: number,
    to?: number
  ): Promise<any[]> {
    if (!this.accNum) {
      throw new Error("Account not selected");
    }

    const now = Date.now();
    const fromTime = from || now - 7 * 24 * 60 * 60 * 1000;
    const toTime = to || now;

    const response = await this.request<{ d: { bars: any[] } }>(
      `/trade/history/${this.accNum}?instrumentId=${instrumentId}&resolution=${resolution}&from=${fromTime}&to=${toTime}`
    );
    return response.d.bars;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getAccountNumber(): number | null {
    return this.accNum;
  }
}

export const tradeLockerInstances = new Map<string, TradeLockerService>();

export function getTradeLockerService(
  userId: string,
  server: string = "live.tradelocker.com"
): TradeLockerService {
  const key = `${userId}-${server}`;
  if (!tradeLockerInstances.has(key)) {
    tradeLockerInstances.set(key, new TradeLockerService(server));
  }
  return tradeLockerInstances.get(key)!;
}

export function clearTradeLockerService(userId: string): void {
  for (const key of tradeLockerInstances.keys()) {
    if (key.startsWith(`${userId}-`)) {
      tradeLockerInstances.delete(key);
    }
  }
}

export function createTradeLockerService(
  server: string = "live.tradelocker.com"
): TradeLockerService {
  return new TradeLockerService(server);
}

export function initializeTradeLockerService(
  userId: string,
  server: string,
  accessToken: string,
  refreshToken: string,
  accountNumber?: number
): TradeLockerService {
  const service = getTradeLockerService(userId, server);
  service.setTokens(accessToken, refreshToken);
  if (accountNumber) {
    service.setAccount(accountNumber);
  }
  return service;
}
