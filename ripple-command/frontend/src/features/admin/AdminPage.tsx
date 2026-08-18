import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { listEntities, createSupplier, type SupplierPayload } from "@/lib/api/entities";
import { api } from "@/lib/api/client";

const KINDS = ["suppliers", "factories", "warehouses", "transport-hubs", "dealers", "products", "routes"];

const EMPTY_SUPPLIER: SupplierPayload = {
  name: "", city: "", lat: 20.0, lon: 78.0, capacity_units_per_week: 1000, lead_time_days: 3, reliability: 0.95, risk_score: 15,
};

function AddSupplierForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<SupplierPayload>(EMPTY_SUPPLIER);
  const mutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      setForm(EMPTY_SUPPLIER);
      onCreated();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
      className="grid grid-cols-2 gap-3 border border-graphite-300/30 bg-stone-50 p-4 sm:grid-cols-4"
    >
      <div className="col-span-2">
        <label className="text-xs text-graphite-500">Name</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full border border-graphite-300/40 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="text-xs text-graphite-500">City</label>
        <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="mt-1 w-full border border-graphite-300/40 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="text-xs text-graphite-500">Capacity / week</label>
        <input required type="number" min={1} value={form.capacity_units_per_week}
          onChange={(e) => setForm({ ...form, capacity_units_per_week: Number(e.target.value) })}
          className="mt-1 w-full border border-graphite-300/40 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="text-xs text-graphite-500">Lead Time (days)</label>
        <input required type="number" min={0} step={0.5} value={form.lead_time_days}
          onChange={(e) => setForm({ ...form, lead_time_days: Number(e.target.value) })}
          className="mt-1 w-full border border-graphite-300/40 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="text-xs text-graphite-500">Reliability (0-1)</label>
        <input required type="number" min={0} max={1} step={0.01} value={form.reliability}
          onChange={(e) => setForm({ ...form, reliability: Number(e.target.value) })}
          className="mt-1 w-full border border-graphite-300/40 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div className="col-span-2 flex items-end gap-3 sm:col-span-4">
        <button type="submit" disabled={mutation.isPending}
          className="bg-charcoal-800 px-4 py-2 text-sm font-medium text-stone-50 hover:bg-charcoal-700 disabled:opacity-40">
          {mutation.isPending ? "Adding\u2026" : "Add Supplier"}
        </button>
        {mutation.isError && <span className="text-xs text-health-critical">Validation failed &mdash; check capacity &gt; 0 and lat/lon are set.</span>}
      </div>
    </form>
  );
}

export function AdminPage() {
  const [kind, setKind] = useState("suppliers");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: ["entities", kind, "admin"], queryFn: () => listEntities(kind) });

  const resetMutation = useMutation({
    mutationFn: () => api.post("/admin/reset-demo-data"),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const columns = data?.items[0] ? Object.keys(data.items[0]).filter((k) => k !== "created_at" && k !== "updated_at") : [];

  return (
    <AppShell title="Admin \u00b7 Master Data">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`border px-3 py-1.5 text-[13px] font-medium capitalize ${kind === k ? "border-charcoal-800 bg-charcoal-800 text-stone-50" : "border-graphite-300/40 text-graphite-700"}`}>
                {k.replace("-", " ")}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {kind === "suppliers" && (
              <button onClick={() => setShowForm((v) => !v)}
                className="border border-graphite-300/40 px-3 py-1.5 text-[13px] font-medium text-graphite-700 hover:bg-graphite-300/10">
                {showForm ? "Hide Form" : "Add Supplier"}
              </button>
            )}
            <button
              onClick={() => { if (confirm("Reset all demo data? This reseeds the entire network.")) resetMutation.mutate(); }}
              className="border border-health-critical/40 px-3 py-1.5 text-[13px] font-medium text-health-critical hover:bg-health-critical/5"
            >
              {resetMutation.isPending ? "Resetting\u2026" : "Reset Demo Data"}
            </button>
          </div>
        </div>

        {showForm && kind === "suppliers" && (
          <AddSupplierForm onCreated={() => queryClient.invalidateQueries({ queryKey: ["entities", "suppliers"] })} />
        )}

        {isLoading && <LoadingState message="Loading master data" />}
        {error && <ErrorState message="Could not load entities." />}

        {data && (
          <div className="overflow-x-auto border border-graphite-300/30 bg-stone-50">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-graphite-300/30 text-[10px] uppercase tracking-wide text-graphite-500">
                  {columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{c.replace(/_/g, " ")}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-300/15">
                {data.items.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-graphite-300/5">
                    {columns.map((c) => (
                      <td key={c} className="whitespace-nowrap px-3 py-1.5 font-mono tabular text-graphite-700">
                        {typeof row[c] === "number" ? (row[c] as number).toFixed(2) : String(row[c] ?? "")}
                      </td>
                    ))}
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
