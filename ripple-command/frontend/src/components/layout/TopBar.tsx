import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

interface HealthPing {
  status: string;
  app_env: string;
  demo_mode: boolean;
  using_sqlite_fallback: boolean;
  ai_enabled: boolean;
}

export function TopBar({ title, onToggleCopilot, copilotOpen }: {
  title: string;
  onToggleCopilot: () => void;
  copilotOpen: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["health-ping"],
    queryFn: () => api.get<HealthPing>("/health"),
    refetchInterval: 30_000,
  });

  const [lastSync, setLastSync] = useState(new Date());
  useEffect(() => {
    if (data) setLastSync(new Date());
  }, [data]);

  return (
    <header className="flex items-center justify-between border-b border-graphite-300/30 bg-stone-50 px-6 py-3">
      <div>
        <h1 className="text-[15px] font-semibold text-graphite-900">{title}</h1>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-graphite-500">
          <span>
            Environment: <span className="font-medium text-graphite-700">{data?.demo_mode ? "Demo" : data?.app_env ?? "&mdash;"}</span>
          </span>
          <span aria-hidden>&middot;</span>
          <span>Last sync {lastSync.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
          {data?.using_sqlite_fallback && (
            <>
              <span aria-hidden>&middot;</span>
              <span>Local data store</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={onToggleCopilot}
        className={`rounded-sm border px-3 py-1.5 text-[13px] font-medium transition-colors ${
          copilotOpen
            ? "border-charcoal-800 bg-charcoal-800 text-stone-50"
            : "border-graphite-300/40 text-graphite-700 hover:bg-graphite-300/10"
        }`}
      >
        AROC Copilot
      </button>
    </header>
  );
}
