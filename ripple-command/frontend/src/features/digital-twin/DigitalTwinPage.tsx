import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getGraph } from "@/lib/api/entities";
import type { GraphNode } from "@/types";
import { TopologyView } from "./TopologyView";
import { GeoView } from "./GeoView";
import { NodeDetailsPanel } from "./NodeDetailsPanel";

export function DigitalTwinPage() {
  const [view, setView] = useState<"geographic" | "topology">("topology");
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["graph"], queryFn: getGraph });

  return (
    <AppShell title="Digital Twin">
      <div className="flex h-[calc(100vh-104px)] flex-col">
        <div className="mb-3 flex items-center gap-2">
          {(["topology", "geographic"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`border px-3 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                view === v
                  ? "border-charcoal-800 bg-charcoal-800 text-stone-50"
                  : "border-graphite-300/40 text-graphite-700 hover:bg-graphite-300/10"
              }`}
            >
              {v === "topology" ? "Dependency Topology" : "Geographic"}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 border border-graphite-300/30 bg-stone-50">
          <div className="min-w-0 flex-1">
            {isLoading && <LoadingState message="Loading network state" />}
            {error && <ErrorState message="Could not load the digital twin graph." />}
            {data && view === "topology" && <TopologyView graph={data} onSelect={setSelected} />}
            {data && view === "geographic" && <GeoView graph={data} onSelect={setSelected} />}
          </div>
          {selected && <NodeDetailsPanel node={selected} onClose={() => setSelected(null)} />}
        </div>
      </div>
    </AppShell>
  );
}
