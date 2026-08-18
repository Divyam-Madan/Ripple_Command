import type { GraphNode } from "@/types";
import { StatusBadge } from "@/components/data-display/StatusBadge";

const FIELD_LABELS: Record<string, string> = {
  capacity: "Capacity",
  lead_time_days: "Lead Time (days)",
  reliability: "Reliability",
  risk_score: "Risk Score",
  production_rate: "Production Rate / day",
  raw_material_buffer_units: "Raw Material Buffer",
  num_production_lines: "Production Lines",
  safety_stock: "Safety Stock",
  on_hand: "On Hand",
  throughput: "Throughput / day",
  demand_per_week: "Demand / week",
};

export function NodeDetailsPanel({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const fieldEntries = Object.entries(FIELD_LABELS).filter(([key]) => node[key] !== undefined);

  return (
    <aside className="w-[300px] shrink-0 border-l border-graphite-300/30 bg-stone-50">
      <div className="flex items-center justify-between border-b border-graphite-300/30 px-4 py-3">
        <div className="text-sm font-semibold text-graphite-900">Node Detail</div>
        <button onClick={onClose} className="text-xs text-graphite-500 hover:text-graphite-800">Close</button>
      </div>
      <div className="space-y-4 px-4 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-graphite-500 capitalize">{node.node_type.replace("_", " ")}</div>
          <div className="mt-0.5 text-[15px] font-semibold text-graphite-900">{node.name}</div>
          <div className="mt-1.5"><StatusBadge status={node.status} /></div>
        </div>
        {node.city && (
          <div className="text-[13px] text-graphite-600">{node.city as string}</div>
        )}
        <div className="space-y-1.5 border-t border-graphite-300/20 pt-3">
          {fieldEntries.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between text-[13px]">
              <span className="text-graphite-500">{label}</span>
              <span className="font-mono tabular text-graphite-800">
                {typeof node[key] === "number" ? (node[key] as number).toFixed(key === "reliability" ? 2 : 1) : String(node[key])}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
