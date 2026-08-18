import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getAnalyticsOverview } from "@/lib/api/analytics";
import { formatCurrencyINR } from "@/lib/formatting/number";

const CHART_COLORS = ["#3C6E8F", "#B8863A", "#AE3E32", "#4C7A5E", "#8B8F86"];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-graphite-300/30 bg-stone-50">
      <div className="border-b border-graphite-300/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-graphite-500">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["analytics"], queryFn: getAnalyticsOverview });

  return (
    <AppShell title="Analytics">
      {isLoading && <LoadingState message="Aggregating network analytics" />}
      {error && <ErrorState message="Could not load analytics." />}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Lowest Supplier Reliability">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.supplier_reliability_lowest} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#DAD4C6" horizontal={false} />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${Math.round(v * 100)}%`} />
                <Bar dataKey="reliability" fill="#3C6E8F" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Lowest Route Reliability">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.route_reliability_lowest} margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#DAD4C6" vertical={false} />
                <XAxis dataKey="mode" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${Math.round(v * 100)}%`} />
                <Bar dataKey="reliability" fill="#4C7A5E" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Most Exposed Entities">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.most_exposed_entities} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#DAD4C6" horizontal={false} />
                <XAxis type="number" tickFormatter={formatCurrencyINR} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrencyINR(v)} />
                <Bar dataKey="financial_exposure" fill="#AE3E32" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Most Costly Disruption Types">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.most_costly_disruption_types} margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#DAD4C6" vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tickFormatter={formatCurrencyINR} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrencyINR(v)} />
                <Bar dataKey="total_exposure" radius={[2, 2, 0, 0]}>
                  {data.most_costly_disruption_types.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Inventory vs Safety Stock by Warehouse">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.inventory_trend} margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#DAD4C6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="on_hand" fill="#3C6E8F" radius={[2, 2, 0, 0]} name="On Hand" />
                <Bar dataKey="safety_stock" fill="#B8863A" radius={[2, 2, 0, 0]} name="Safety Stock" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Summary Figures">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-graphite-500">Avg Delay (delayed shipments)</div>
                <div className="mt-1 font-mono text-2xl tabular text-graphite-900">{data.average_delay_hours.toFixed(1)}h</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-graphite-500">Production Loss (recent runs)</div>
                <div className="mt-1 font-mono text-2xl tabular text-health-critical">{formatCurrencyINR(data.production_loss_total)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-graphite-500">Recommended Recovery Cost</div>
                <div className="mt-1 font-mono text-2xl tabular text-steel-600">{formatCurrencyINR(data.recovery_cost_total)}</div>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
