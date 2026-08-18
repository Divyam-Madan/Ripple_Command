import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { listEntities } from "@/lib/api/entities";
import { simulateDisruption } from "@/lib/api/simulation";
import { optimizeRecovery } from "@/lib/api/optimization";
import { formatCurrencyINR } from "@/lib/formatting/number";
import { ImpactChain } from "./ImpactChain";
import { RecoveryOptions } from "@/features/optimization/RecoveryOptions";

const DISRUPTION_TYPES = [
  { value: "supplier_delay", label: "Supplier Delay", targetKind: "suppliers", targetType: "supplier" },
  { value: "warehouse_stockout", label: "Warehouse Stockout", targetKind: "warehouses", targetType: "warehouse" },
  { value: "demand_surge", label: "Demand Surge", targetKind: "dealers", targetType: "dealer" },
] as const;

interface EntityRow { id: string; name: string }

export function SimulationPage() {
  const [disruptionType, setDisruptionType] = useState<(typeof DISRUPTION_TYPES)[number]["value"]>("supplier_delay");
  const [targetId, setTargetId] = useState<string>("");
  const [delayHours, setDelayHours] = useState(12);

  const activeConfig = DISRUPTION_TYPES.find((d) => d.value === disruptionType)!;

  const { data: entities, isLoading: entitiesLoading } = useQuery({
    queryKey: ["entities", activeConfig.targetKind],
    queryFn: () => listEntities(activeConfig.targetKind),
  });

  const entityOptions = useMemo<EntityRow[]>(
    () => (entities?.items ?? []).map((e) => ({ id: e.id as string, name: e.name as string })),
    [entities],
  );

  const simMutation = useMutation({ mutationFn: simulateDisruption });
  const optMutation = useMutation({ mutationFn: optimizeRecovery });

  const runSimulation = () => {
    if (!targetId) return;
    simMutation.reset();
    optMutation.reset();
    simMutation.mutate({
      disruption_type: disruptionType,
      target_type: activeConfig.targetType,
      target_id: targetId,
      delay_hours: disruptionType === "supplier_delay" ? delayHours : 0,
    });
  };

  const runOptimization = () => {
    if (!simMutation.data) return;
    optMutation.mutate(simMutation.data.simulation_run_id);
  };

  const result = simMutation.data;

  return (
    <AppShell title="What-If Simulator">
      <div className="space-y-5">
        <div className="border border-graphite-300/30 bg-stone-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-graphite-500">Disruption Type</label>
              <select
                value={disruptionType}
                onChange={(e) => {
                  setDisruptionType(e.target.value as typeof disruptionType);
                  setTargetId("");
                }}
                className="mt-1.5 w-full border border-graphite-300/40 bg-white px-2.5 py-1.5 text-sm"
              >
                {DISRUPTION_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-graphite-500">Target</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={entitiesLoading}
                className="mt-1.5 w-full border border-graphite-300/40 bg-white px-2.5 py-1.5 text-sm disabled:opacity-50"
              >
                <option value="">Select&hellip;</option>
                {entityOptions.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            {disruptionType === "supplier_delay" && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-graphite-500">
                  Delay Hours: <span className="font-mono text-graphite-800">{delayHours}h</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={delayHours}
                  onChange={(e) => setDelayHours(Number(e.target.value))}
                  className="mt-3 w-full accent-steel-600"
                />
              </div>
            )}
          </div>
          <button
            onClick={runSimulation}
            disabled={!targetId || simMutation.isPending}
            className="mt-4 bg-charcoal-800 px-4 py-2 text-sm font-medium text-stone-50 transition-colors hover:bg-charcoal-700 disabled:opacity-40"
          >
            {simMutation.isPending ? "Running Disruption Simulation\u2026" : "Run Simulation"}
          </button>
        </div>

        {simMutation.isPending && <LoadingState message="Running disruption simulation" />}
        {simMutation.isError && <ErrorState message="Simulation failed. Confirm the target entity has network dependencies to trace." />}

        {result && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border border-graphite-300/30 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-graphite-500">Severity</div>
                <div className="mt-1.5"><StatusBadge status={result.severity} /></div>
              </div>
              <div className="border border-graphite-300/30 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-graphite-500">Financial Exposure</div>
                <div className="mt-1 font-mono text-xl tabular text-health-critical">{formatCurrencyINR(result.total_financial_exposure)}</div>
              </div>
              <div className="border border-graphite-300/30 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-graphite-500">Health Before &rarr; After</div>
                <div className="mt-1 font-mono text-xl tabular text-graphite-900">
                  {result.health_before.toFixed(1)} &rarr; {result.health_after.toFixed(1)}
                </div>
              </div>
              <div className="border border-graphite-300/30 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-graphite-500">Simulation ID</div>
                <div className="mt-1 truncate font-mono text-sm text-graphite-700">{result.simulation_run_id}</div>
              </div>
            </div>

            <ImpactChain stages={result.impact_chain} />

            {result.recovery_requirement ? (
              <div className="border border-graphite-300/30 bg-stone-50 p-4">
                <button
                  onClick={runOptimization}
                  disabled={optMutation.isPending}
                  className="bg-steel-600 px-4 py-2 text-sm font-medium text-stone-50 transition-colors hover:bg-steel-500 disabled:opacity-40"
                >
                  {optMutation.isPending ? "Calculating Recovery Options\u2026" : "Optimize Recovery"}
                </button>
              </div>
            ) : (
              <EmptyState
                title="No recovery action required"
                description="The simulated disruption does not project a shortage that needs an intervention."
              />
            )}

            {optMutation.data && <RecoveryOptions result={optMutation.data} />}
          </>
        )}
      </div>
    </AppShell>
  );
}
