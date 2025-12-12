import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import type {
  Strategy,
  InsertStrategy,
  Trade,
  InsertTrade,
  RiskConfig,
  InsertRiskConfig,
  SystemLog,
  InsertSystemLog,
  BacktestResult,
  InsertBacktestResult,
} from "@shared/schema";

// ============================================================================
// STRATEGIES
// ============================================================================

export function useStrategies() {
  return useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });
}

export function useStrategy(id: string) {
  return useQuery<Strategy>({
    queryKey: [`/api/strategies/${id}`],
    enabled: !!id,
  });
}

export function useCreateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertStrategy, "userId">) => {
      const res = await apiRequest("POST", "/api/strategies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
    },
  });
}

export function useUpdateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertStrategy> }) => {
      const res = await apiRequest("PUT", `/api/strategies/${id}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: [`/api/strategies/${variables.id}`] });
    },
  });
}

export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/strategies/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
    },
  });
}

// ============================================================================
// TRADES
// ============================================================================

export function useTrades(limit?: number) {
  return useQuery<Trade[]>({
    queryKey: limit ? [`/api/trades?limit=${limit}`] : ["/api/trades"],
  });
}

export function useCreateTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertTrade, "userId">) => {
      const res = await apiRequest("POST", "/api/trades", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    },
  });
}

export function useUpdateTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertTrade> }) => {
      const res = await apiRequest("PUT", `/api/trades/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    },
  });
}

// ============================================================================
// RISK CONFIG
// ============================================================================

export function useRiskConfig() {
  return useQuery<RiskConfig | null>({
    queryKey: ["/api/risk-config"],
  });
}

export function useUpsertRiskConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertRiskConfig, "userId">) => {
      const res = await apiRequest("PUT", "/api/risk-config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-config"] });
    },
  });
}

// ============================================================================
// SYSTEM LOGS
// ============================================================================

export function useSystemLogs(limit?: number) {
  return useQuery<SystemLog[]>({
    queryKey: limit ? [`/api/logs?limit=${limit}`] : ["/api/logs"],
  });
}

export function useCreateSystemLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertSystemLog, "userId">) => {
      const res = await apiRequest("POST", "/api/logs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    },
  });
}

// ============================================================================
// BACKTEST RESULTS
// ============================================================================

export function useBacktestResults(strategyId?: string) {
  return useQuery<BacktestResult[]>({
    queryKey: strategyId ? [`/api/backtest?strategyId=${strategyId}`] : ["/api/backtest"],
  });
}

export function useCreateBacktestResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertBacktestResult, "userId">) => {
      const res = await apiRequest("POST", "/api/backtest", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backtest"] });
    },
  });
}

// ============================================================================
// BROKER CONNECTION
// ============================================================================

interface BrokerStatus {
  connected: boolean;
  broker?: string;
  email?: string;
  server?: string;
  accountNumber?: string;
  lastConnected?: string;
}

interface BrokerAccount {
  id: number;
  name: string;
  accNum: number;
  currency: string;
  balance: number;
  equity: number;
}

interface ConnectResponse {
  success: boolean;
  accounts: BrokerAccount[];
}

export function useBrokerStatus() {
  return useQuery<BrokerStatus>({
    queryKey: ["/api/broker/status"],
    refetchInterval: 30000,
  });
}

export function useConnectBroker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string; server: string }) => {
      const res = await apiRequest("POST", "/api/broker/connect", data);
      return res.json() as Promise<ConnectResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker/status"] });
    },
  });
}

export function useSelectBrokerAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { accountId: string; accountNumber: number }) => {
      const res = await apiRequest("POST", "/api/broker/select-account", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker/status"] });
    },
  });
}

export function useDisconnectBroker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/broker/disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker/status"] });
    },
  });
}

export function useBrokerAccounts(enabled = false) {
  return useQuery<BrokerAccount[]>({
    queryKey: ["/api/broker/accounts"],
    enabled,
  });
}

export function useBrokerInstruments(enabled: boolean) {
  return useQuery<Array<{ tradableInstrumentId: number; name: string; description?: string }>>({
    queryKey: ["/api/broker/instruments"],
    enabled,
  });
}

export function useBrokerQuotes(symbols: string[], enabled = true) {
  const symbolsParam = symbols.join(",");
  return useQuery<Array<{ s: string; bid: number; ask: number; timestamp: number }>>({
    queryKey: [`/api/broker/quotes?symbols=${symbolsParam}`],
    enabled: enabled && symbols.length > 0,
    refetchInterval: 1000,
  });
}

export function useBrokerPositions() {
  return useQuery<any[]>({
    queryKey: ["/api/broker/positions"],
    refetchInterval: 5000,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      instrumentId: number;
      qty: number;
      side: "buy" | "sell";
      type: "market" | "limit" | "stop";
      price?: number;
      stopLoss?: number;
      takeProfit?: number;
    }) => {
      const res = await apiRequest("POST", "/api/broker/orders", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = body?.error || body?.details || `HTTP ${res.status}`;
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/broker/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/broker/quotes"] });
    },
  });
}
