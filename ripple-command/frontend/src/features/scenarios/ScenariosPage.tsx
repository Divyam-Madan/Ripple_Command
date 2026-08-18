import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { listScenarios, runScenario } from "@/lib/api/simulation";

export function ScenariosPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["scenarios"], queryFn: listScenarios });

  const runMutation = useMutation({
    mutationFn: runScenario,
    onSuccess: () => navigate("/simulator"),
  });

  return (
    <AppShell title="Scenario Library">
      {isLoading && <LoadingState message="Loading scenario library" />}
      {error && <ErrorState message="Could not load scenarios." />}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((s) => (
            <div
              key={s.id}
              className={`flex flex-col border p-4 ${s.is_flagship ? "border-steel-600 bg-steel-100/50" : "border-graphite-300/30 bg-stone-50"}`}
            >
              {s.is_flagship && (
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-steel-600">
                  Flagship Demonstration
                </div>
              )}
              <div className="text-[14px] font-semibold text-graphite-900">{s.name}</div>
              <div className="mt-1.5 flex-1 text-[13px] leading-relaxed text-graphite-600">{s.description}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-graphite-500">
                  {s.disruption_type.replace(/_/g, " ")}
                  {s.delay_hours > 0 ? ` \u00b7 ${s.delay_hours}h` : ""}
                </span>
                {s.target_type ? (
                  <button
                    onClick={() => runMutation.mutate(s.id)}
                    disabled={runMutation.isPending}
                    className="bg-charcoal-800 px-3 py-1.5 text-[12px] font-medium text-stone-50 hover:bg-charcoal-700 disabled:opacity-40"
                  >
                    {runMutation.isPending ? "Running\u2026" : "Load into Simulator"}
                  </button>
                ) : (
                  <span className="text-[11px] text-graphite-400">Baseline &mdash; no action</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
