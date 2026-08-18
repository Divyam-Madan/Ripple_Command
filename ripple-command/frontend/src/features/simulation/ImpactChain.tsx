import type { ImpactStage } from "@/types";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { formatCurrencyINR, formatUnits } from "@/lib/formatting/number";

const NODE_TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier", factory: "Factory", warehouse: "Warehouse",
  transport_hub: "Transport Hub", dealer: "Dealer", customer: "Customer",
};

export function ImpactChain({ stages }: { stages: ImpactStage[] }) {
  if (stages.length === 0) return null;

  return (
    <div className="border border-graphite-300/30 bg-stone-50">
      <div className="border-b border-graphite-300/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-graphite-500">
        Disruption Propagation Chain
      </div>
      <ol className="px-4 py-4">
        {stages.map((stage, idx) => (
          <li key={`${stage.node_type}-${stage.node_id}-${idx}`} className="relative pb-6 pl-8 last:pb-0">
            {idx < stages.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[7px] top-4 h-full w-px bg-graphite-300/50"
              />
            )}
            <span
              aria-hidden
              className={`absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-stone-50 ${
                stage.status === "critical"
                  ? "bg-health-critical"
                  : stage.status === "warning"
                    ? "bg-health-warn"
                    : "bg-health-good"
              }`}
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-graphite-500">
                {NODE_TYPE_LABEL[stage.node_type] ?? stage.node_type}
              </span>
              <span className="text-[14px] font-semibold text-graphite-900">{stage.node_name}</span>
              <StatusBadge status={stage.status} />
            </div>
            <div className="mt-1 text-[13px] text-graphite-700">{stage.reason}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] tabular text-graphite-500">
              {stage.estimated_time_hours > 0 && <span>T+{stage.estimated_time_hours.toFixed(1)}h</span>}
              {stage.affected_quantity > 0 && <span>{formatUnits(stage.affected_quantity)}</span>}
              {stage.financial_impact > 0 && (
                <span className="text-health-critical">{formatCurrencyINR(stage.financial_impact)}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
