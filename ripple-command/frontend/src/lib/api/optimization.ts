import { api } from "./client";
import type { OptimizationResult } from "@/types";

export const optimizeRecovery = (simulationRunId: string) =>
  api.post<OptimizationResult>("/optimization/recover", { simulation_run_id: simulationRunId });

export const getRecoveryOptions = (simulationRunId: string) =>
  api.get<OptimizationResult>(`/optimization/${simulationRunId}`);
