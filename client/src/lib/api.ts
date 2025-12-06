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
