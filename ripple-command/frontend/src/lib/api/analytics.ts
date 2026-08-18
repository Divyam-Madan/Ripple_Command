import { api } from "./client";

export interface AnalyticsOverview {
  supplier_reliability_lowest: { name: string; reliability: number; risk_score: number }[];
  route_reliability_lowest: { id: string; mode: string; reliability: number; delay_probability: number }[];
  average_delay_hours: number;
  inventory_trend: { name: string; on_hand: number; safety_stock: number; capacity: number }[];
  disruption_frequency: Record<string, number>;
  production_loss_total: number;
  recovery_cost_total: number;
  most_exposed_entities: { name: string; financial_exposure: number }[];
  most_costly_disruption_types: { type: string; total_exposure: number }[];
}

export const getAnalyticsOverview = () => api.get<AnalyticsOverview>("/analytics/overview");
