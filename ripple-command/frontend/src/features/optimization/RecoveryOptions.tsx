import type { OptimizationResult } from "@/types";
import { formatCurrencyINR, formatUnits } from "@/lib/formatting/number";

const TYPE_LABEL: Record<string, string> = {
  expedite_shipment: "Expedite Shipment",
  alternate_supplier: "Alternate Supplier",
  warehouse_reallocation: "Warehouse Reallocation",
  do_nothing: "Do Nothing",
};

export function RecoveryOptions({ result }: { result: OptimizationResult }) {
  return (
    <div className="border border-graphite-300/30 bg-stone-50">
      <div className="border-b border-graphite-300/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-graphite-500">
        Recovery Options
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {result.options.map((opt) => (
          <div
            key={opt.id}
            className={`flex flex-col border p-3.5 ${
              opt.is_recommended
                ? "border-steel-600 bg-steel-100/60"
                : "border-graphite-300/30 bg-white"
            }`}
          >
            {opt.is_recommended && (
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-steel-600">
                Recommended
              </div>
            )}
            <div className="text-[13px] font-semibold text-graphite-900">{TYPE_LABEL[opt.type] ?? opt.type}</div>
            <div className="mt-1 text-[12px] leading-snug text-graphite-600">{opt.description}</div>
            <div className="mt-3 space-y-1 font-mono text-[12px] tabular text-graphite-700">
              <div className="flex justify-between"><span className="text-graphite-500">Cost</span><span>{formatCurrencyINR(opt.cost)}</span></div>
              <div className="flex justify-between"><span className="text-graphite-500">ETA</span><span>{opt.eta_hours.toFixed(1)}h</span></div>
              <div className="flex justify-between"><span className="text-graphite-500">Recovers</span><span>{formatUnits(opt.recovered_quantity)}</span></div>
              <div className="flex justify-between"><span className="text-graphite-500">Remaining Risk</span><span>{opt.remaining_risk_score.toFixed(0)}/100</span></div>
              <div className="flex justify-between"><span className="text-graphite-500">Savings</span><span>{formatCurrencyINR(opt.expected_savings)}</span></div>
            </div>
            <div className="mt-3 text-[11px]">
              {opt.feasible ? (
                <span className="text-health-good">Feasible within window</span>
              ) : (
                <span className="text-health-critical">Not feasible in time</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {result.recommended_reasons.length > 0 && (
        <div className="border-t border-graphite-300/30 px-4 py-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-graphite-500">
            Why This Action
          </div>
          <ul className="space-y-1 text-[13px] text-graphite-800">
            {result.recommended_reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-steel-600">&bull;</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
