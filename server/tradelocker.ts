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
  private serverName: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accNum: number | null = null;

  constructor(100
    string = "live.tradelocker.com") {
    this.serverName = server;
    const mappedServer = server === "HEROFX" ? "demo.tradelocker.com" : server;
this.baseUrl = `https://${mappedServer}`;

    async authenticate(email: string, password: string): Promise<any> {
      try {
        const response = await fetch(`${this.baseUrl}/backend-api/auth/jwt/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            server: this.serverName, // Use the original server name here
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Authentication failed: ${response.status} ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        return data;
      } catch (error: any) {
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }