import { api } from "./client";
import type { Scenario, SimulationResult } from "@/types";

export const simulateDisruption = (payload: {
  disruption_type: string;
  target_type: string;
  target_id: string;
  delay_hours: number;
}) => api.post<SimulationResult>("/simulations", payload);

export const getSimulation = (id: string) => api.get<SimulationResult>(`/simulations/${id}`);

export const listScenarios = () => api.get<{ items: Scenario[] }>("/scenarios");

export const runScenario = (id: string) => api.post<SimulationResult>(`/scenarios/${id}/run`);
