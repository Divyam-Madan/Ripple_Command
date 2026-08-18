import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/data-display/KpiCard";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { formatCurrencyINR, formatPercent } from "@/lib/formatting/number";
import { formatRelativeToNow } from "@/lib/formatting/date";

function HealthBar({ score }: { score: number }) {
  const tone = score >= 80 ? "bg-health-good" : score >= 60 ? "bg-health-warn" : "bg-health-critical";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-graphite-500">Supply Chain Health</span>
        <span className="font-mono text-3xl font-medium tabular text-graphite-900">{score.toFixed(1)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full bg-graphite-300/25">
        <div className={`h-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    refetchInterval: 30_000,
  });

  return (
    <AppShell title="AROC Control Tower">
      {isLoading && <LoadingState message="Calculating supply chain health" />}
      {error && <ErrorState message="Could not reach the AROC backend. Confirm the API is running and VITE_API_BASE_URL is set." />}
      {data && (
        <div className="space-y-5">
          <div className="border border-graphite-300/30 bg-stone-50 p-4">
            <HealthBar score={data.health.score} />
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {Object.entries(data.health.components).map(([key, val]) => (
                <div key={key}>
                  <div className="text-[10px] uppercase tracking-wide text-graphite-500">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="font-mono text-sm text-graphite-800 tabular">{val.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Active Shipments" value={String(data.kpis.active_shipments)} />
            <KpiCard
              label="At-Risk Shipments"
              value={String(data.kpis.at_risk_shipments)}
              tone={data.kpis.at_risk_shipments > 15 ? "warn" : "default"}
            />
            <KpiCard
              label="Critical Suppliers"
              value={String(data.kpis.critical_suppliers)}
              tone={data.kpis.critical_suppliers > 0 ? "critical" : "good"}
            />
            <KpiCard
              label="Projected Stockouts"
              value={String(data.kpis.projected_stockouts)}
              tone={data.kpis.projected_stockouts > 0 ? "warn" : "good"}
            />
            <KpiCard
              label="Production at Risk"
              value={String(data.kpis.production_at_risk)}
              tone={data.kpis.production_at_risk > 0 ? "critical" : "good"}
            />
            <KpiCard label="Active Disruptions" value={String(data.kpis.active_disruptions)} />
            <KpiCard label="Financial Exposure" value={formatCurrencyINR(data.kpis.financial_exposure)} tone="warn" />
            <Link
              to="/simulator"
              className="flex flex-col justify-center border border-charcoal-800 bg-charcoal-800 px-4 py-3.5 text-stone-50 transition-colors hover:bg-charcoal-700"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-stone-300">Quick Access</span>
              <span className="mt-1 text-sm font-semibold">Run What-If Simulator &rarr;</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="border border-graphite-300/30 bg-stone-50 lg:col-span-2">
              <div className="border-b border-graphite-300/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-graphite-500">
                Active Disruption Feed
              </div>
              <div className="divide-y divide-graphite-300/20">
                {data.alerts.length === 0 && <div className="px-4 py-6 text-sm text-graphite-500">No active alerts.</div>}
                {data.alerts.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge status={a.severity} />
                      <span className="text-[11px] text-graphite-500">{formatRelativeToNow(a.created_at)}</span>
                    </div>
                    <div className="mt-1.5 text-[13px] text-graphite-900">{a.message}</div>
                    {a.recommended_action && (
                      <div className="mt-1 text-[12px] text-graphite-500">{a.recommended_action}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-graphite-300/30 bg-stone-50">
              <div className="border-b border-graphite-300/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-graphite-500">
                Top Risk Suppliers
              </div>
              <div className="divide-y divide-graphite-300/20">
                {data.top_risk_suppliers.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <div className="text-[13px] text-graphite-900">{s.name}</div>
                      <div className="text-[11px] text-graphite-500">Reliability {formatPercent(s.reliability)}</div>
                    </div>
                    <div className="font-mono text-sm tabular text-health-critical">{s.risk_score.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-graphite-300/30 bg-stone-50">
            <div className="border-b border-graphite-300/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-graphite-500">
              Shipment Watchlist
            </div>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-graphite-500">
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Route</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Delay Probability</th>
                  <th className="px-4 py-2 font-medium">Predicted ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-300/20">
                {data.shipment_watchlist.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-mono tabular">{s.order_id}</td>
                    <td className="px-4 py-2 capitalize text-graphite-600">
                      {s.source_type.replace("_", " ")} &rarr; {s.dest_type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-2 capitalize">{s.status}</td>
                    <td className="px-4 py-2 font-mono tabular">{formatPercent(s.delay_probability)}</td>
                    <td className="px-4 py-2 text-graphite-600">{formatRelativeToNow(s.predicted_eta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
