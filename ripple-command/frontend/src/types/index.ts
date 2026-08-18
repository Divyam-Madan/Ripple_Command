export type NodeStatus = "healthy" | "warning" | "critical" | "inactive";
export type Severity = "critical" | "high" | "medium" | "informational";

export interface HealthComponents {
  inventory_health: number;
  shipment_reliability: number;
  supplier_risk: number;
  production_risk: number;
  capacity_utilization: number;
  demand_coverage: number;
}

export interface SupplyChainHealth {
  score: number;
  components: HealthComponents;
  weights: HealthComponents;
}

export interface DashboardKpis {
  active_shipments: number;
  at_risk_shipments: number;
  critical_suppliers: number;
  projected_stockouts: number;
  production_at_risk: number;
  active_disruptions: number;
  financial_exposure: number;
}

export interface AlertItem {
  id: string;
  severity: Severity;
  source_type: string;
  source_id: string;
  message: string;
  impact_summary: string;
  recommended_action: string;
  simulation_run_id?: string;
  created_at: string;
}

export interface RiskSupplier {
  id: string;
  name: string;
  risk_score: number;
  reliability: number;
  status: NodeStatus;
}

export interface ShipmentWatchItem {
  id: string;
  order_id: string;
  source_type: string;
  dest_type: string;
  status: string;
  delay_probability: number;
  predicted_eta: string;
  quantity: number;
}

export interface DashboardSummary {
  health: SupplyChainHealth;
  kpis: DashboardKpis;
  alerts: AlertItem[];
  top_risk_suppliers: RiskSupplier[];
  shipment_watchlist: ShipmentWatchItem[];
}

export interface ImpactStage {
  sequence: number;
  node_type: string;
  node_id: string;
  node_name: string;
  status: NodeStatus;
  reason: string;
  estimated_time_hours: number;
  affected_quantity: number;
  financial_impact: number;
}

export interface RecoveryRequirement {
  product_id: string;
  quantity_needed: number;
  needed_at_node_type: string;
  needed_at_node_id: string;
  needed_at_node_name: string;
  needed_within_hours: number;
  origin_factory_id: string | null;
  origin_supplier_id: string | null;
  destination_warehouse_id: string | null;
}

export interface SimulationResult {
  simulation_run_id: string;
  disruption_id: string;
  disruption_type: string;
  target_type: string;
  target_id: string;
  target_name: string;
  delay_hours: number;
  severity: Severity;
  health_before: number;
  health_after: number;
  total_financial_exposure: number;
  impact_chain: ImpactStage[];
  affected_order_ids: string[];
  recovery_requirement: RecoveryRequirement | null;
  narrative_summary: string;
}

export interface RecoveryOption {
  id: string;
  type: "expedite_shipment" | "alternate_supplier" | "warehouse_reallocation" | "do_nothing";
  description: string;
  cost: number;
  eta_hours: number;
  feasible: boolean;
  recovered_quantity: number;
  remaining_risk_score: number;
  expected_savings: number;
  is_recommended: boolean;
  source_label?: string;
}

export interface OptimizationResult {
  simulation_run_id: string;
  recovery_requirement: RecoveryRequirement;
  options: RecoveryOption[];
  recommended_reasons: string[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  disruption_type: string;
  target_type: string;
  target_id: string;
  delay_hours: number;
  is_flagship: boolean;
}

export interface ShipmentItem {
  id: string;
  order_id: string;
  product_id: string;
  route_id: string;
  source_type: string;
  source_id: string;
  dest_type: string;
  dest_id: string;
  quantity: number;
  transport_mode: string;
  carrier: string;
  status: string;
  delay_probability: number;
  priority: string;
  current_location: string;
  planned_dispatch: string;
  promised_delivery: string;
  planned_eta: string;
  predicted_eta: string;
}

export interface GraphNode {
  id: string;
  node_type: string;
  node_id: string;
  name: string;
  city: string;
  lat: number | null;
  lon: number | null;
  status: NodeStatus;
  [key: string]: unknown;
}

export interface GraphEdge {
  source: string;
  target: string;
  edge_type: string;
  transport_mode: string;
  transit_time_hours: number;
  delay_probability: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CopilotResponse {
  reply: string;
  tool_calls: string[];
  source: string;
  simulation_run_id?: string;
}
