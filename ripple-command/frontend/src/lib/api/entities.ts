import { api } from "./client";
import type { GraphResponse } from "@/types";

export const listEntities = (kind: string) => api.get<{ items: Record<string, unknown>[] }>(`/entities/${kind}`);
export const getGraph = () => api.get<GraphResponse>("/graph");

export interface SupplierPayload {
  name: string; city: string; lat: number; lon: number;
  capacity_units_per_week: number; lead_time_days: number;
  reliability?: number; risk_score?: number;
}
export const createSupplier = (payload: SupplierPayload) => api.post("/entities/suppliers", payload);
