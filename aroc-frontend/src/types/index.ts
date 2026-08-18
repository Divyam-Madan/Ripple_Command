export interface Supplier {
  id: number;
  name: string;
  code: string;
  location_name: string;
  lat: number;
  lng: number;
  capacity: number;
  reliability_score: number;
  lead_time_days: number;
  cost_per_unit: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: string;
}

export interface Factory {
  id: number;
  name: string;
  code: string;
  location_name: string;
  lat: number;
  lng: number;
  production_rate_per_hour: number;
  capacity: number;
  current_utilization: number;
  status: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  location_name: string;
  lat: number;
  lng: number;
  capacity: number;
  current_inventory: number;
  safety_stock_threshold: number;
  status: string;
}

export interface Shipment {
  id: number;
  shipment_code: string;
  product_id: number;
  quantity: number;
  origin_type: string;
  origin_id: number;
  destination_type: string;
  destination_id: number;
  carrier: string;
  transport_mode: string;
  status: 'pending' | 'in_transit' | 'delayed' | 'delivered' | 'cancelled' | 'at_risk';
  planned_departure: string;
  planned_arrival: string;
  predicted_arrival: string;
  delay_hours: number;
  delay_probability: number;
  risk_level: string;
  current_location_name: string;
}

export interface DashboardKPIs {
  health_score: number;
  active_shipments: number;
  at_risk_shipments: number;
  critical_suppliers: number;
  projected_stockouts: number;
  production_at_risk: number;
  financial_exposure: number;
  active_disruptions: number;
}

export interface ImpactNode {
  node_type: string;
  node_id: number;
  node_name: string;
  impact_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  delay_hours: number;
  inventory_breach: boolean;
  shortage_quantity: number;
  production_loss_hours: number;
  financial_impact: number;
  reason: string;
  sequence_order: number;
}

export interface SimulationResult {
  simulation_run_id: number | null;
  supplier_id: number;
  supplier_name: string;
  disruption_type: string;
  delay_hours: number;
  impact_chain: ImpactNode[];
  total_financial_exposure: number;
  nodes_affected: number;
  shipments_affected: number;
  stockout_hours: number | null;
  production_at_risk: boolean;
  summary: string;
}

export interface RecoveryOption {
  option_type: 'expedite' | 'alternate_supplier' | 'warehouse_reallocation' | 'do_nothing';
  name: string;
  description: string;
  cost: number;
  lead_time_improvement_hours: number;
  recovery_quality_pct: number;
  remaining_risk_pct: number;
  expected_savings: number;
  feasible: boolean;
  recommended: boolean;
}

export interface Alert {
  id: number;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'informational';
  title: string;
  description: string;
  source_node_type: string;
  source_node_id: number;
  created_at: string;
  is_read: boolean;
}

export interface Scenario {
  id: number;
  name: string;
  description: string;
  scenario_type: string;
  config_json: Record<string, unknown>;
}

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls_made?: string[];
  fallback_mode?: boolean;
}

export interface WSEvent {
  type: 'SHIPMENT_STATUS_CHANGE' | 'DISRUPTION_DETECTED' | 'KPI_UPDATE' | 'SIMULATION_COMPLETE' | 'RECOMMENDATION_UPDATE';
  payload: Record<string, unknown>;
}
