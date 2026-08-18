import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { api } from "@/lib/api/client";
import type { AlertItem } from "@/types";
import { formatDateTime } from "@/lib/formatting/date";

const SEVERITIES = ["critical", "high", "medium", "informational"] as const;

export function DisruptionsPage() {
  const [filter, setFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.get<{ items: AlertItem[] }>("/alerts"),
    refetchInterval: 30_000,
  });

  const items = (data?.items ?? []).filter((a) => !filter || a.severity === filter);

  return (
    <AppShell title="Disruption Center">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`border px-3 py-1.5 text-[13px] font-medium ${!filter ? "border-charcoal-800 bg-charcoal-800 text-stone-50" : "border-graphite-300/40 text-graphite-700"}`}
          >
            All
          </button>
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`border px-3 py-1.5 text-[13px] font-medium capitalize ${filter === s ? "border-charcoal-800 bg-charcoal-800 text-stone-50" : "border-graphite-300/40 text-graphite-700"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {isLoading && <LoadingState message="Loading disruption alerts" />}
        {error && <ErrorState message="Could not load alerts." />}
        {data && items.length === 0 && <EmptyState title="No alerts for this filter" />}

        <div className="divide-y divide-graphite-300/20 border border-graphite-300/30 bg-stone-50">
          {items.map((a) => (
            <div key={a.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={a.severity} />
                  <span className="text-[11px] uppercase tracking-wide text-graphite-500">
                    {a.source_type.replace("_", " ")}
                  </span>
                </div>
                <span className="text-[11px] text-graphite-500">{formatDateTime(a.created_at)}</span>
              </div>
              <div className="mt-1.5 text-[14px] text-graphite-900">{a.message}</div>
              {a.impact_summary && <div className="mt-1 text-[13px] text-graphite-600">{a.impact_summary}</div>}
              {a.recommended_action && (
                <div className="mt-1.5 text-[12px] font-medium text-steel-600">{a.recommended_action}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
