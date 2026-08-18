import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { listShipments } from "@/lib/api/shipments";
import { formatDateTime } from "@/lib/formatting/date";
import { formatPercent } from "@/lib/formatting/number";

const STATUS_OPTIONS = ["", "planned", "in_transit", "delayed", "delivered", "cancelled"];

export function ShipmentsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["shipments", status],
    queryFn: () => listShipments(status ? { status } : {}),
  });

  const filtered = (data?.items ?? []).filter(
    (s) => !search || s.order_id.toLowerCase().includes(search.toLowerCase()) || s.carrier.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell title="Shipments">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID or carrier"
            className="w-64 border border-graphite-300/40 bg-stone-50 px-2.5 py-1.5 text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-graphite-300/40 bg-stone-50 px-2.5 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s ? s.replace("_", " ") : "All statuses"}</option>
            ))}
          </select>
          <span className="text-xs text-graphite-500">{filtered.length} shipments</span>
        </div>

        {isLoading && <LoadingState message="Loading shipment data" />}
        {error && <ErrorState message="Could not load shipments." />}
        {data && filtered.length === 0 && <EmptyState title="No shipments match these filters" />}

        {data && filtered.length > 0 && (
          <div className="overflow-x-auto border border-graphite-300/30 bg-stone-50">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-graphite-300/30 text-[11px] uppercase tracking-wide text-graphite-500">
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Route</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">Carrier</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Delay Prob.</th>
                  <th className="px-3 py-2 font-medium">Predicted ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-300/15">
                {filtered.slice(0, 150).map((s) => (
                  <tr key={s.id} className="hover:bg-graphite-300/5">
                    <td className="px-3 py-2 font-mono tabular">{s.order_id}</td>
                    <td className="px-3 py-2 capitalize text-graphite-600">
                      {s.source_type.replace("_", " ")} &rarr; {s.dest_type.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2 font-mono text-graphite-500">{s.product_id.slice(0, 6)}</td>
                    <td className="px-3 py-2 font-mono tabular">{s.quantity.toFixed(0)}</td>
                    <td className="px-3 py-2 capitalize">{s.transport_mode}</td>
                    <td className="px-3 py-2">{s.carrier}</td>
                    <td className="px-3 py-2 capitalize">{s.status.replace("_", " ")}</td>
                    <td className="px-3 py-2 font-mono tabular">{formatPercent(s.delay_probability)}</td>
                    <td className="px-3 py-2 text-graphite-600">{formatDateTime(s.predicted_eta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
