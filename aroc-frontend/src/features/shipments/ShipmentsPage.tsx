import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Shipment } from '@/types';

const statusConfig: Record<string, { dot: string; label: string; badge: string }> = {
  in_transit: { dot: 'bg-blue-600',       label: 'In Transit',  badge: 'bg-blue-500/15 text-blue-800 border-blue-500/30' },
  delayed:    { dot: 'bg-red-600',        label: 'Delayed',     badge: 'bg-red-500/15 text-red-800 border-red-500/30' },
  at_risk:    { dot: 'bg-amber-600',      label: 'At Risk',     badge: 'bg-amber-500/15 text-amber-800 border-amber-500/30' },
  delivered:  { dot: 'bg-emerald-600',    label: 'Delivered',   badge: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30' },
  pending:    { dot: 'bg-stone-500',      label: 'Pending',     badge: 'bg-stone-500/15 text-stone-800 border-stone-400/30' },
  cancelled:  { dot: 'bg-stone-400',      label: 'Cancelled',   badge: 'bg-stone-400/15 text-stone-700 border-stone-400/30' },
};

const riskColor: Record<string, string> = {
  high:     'text-red-700 font-black',
  critical: 'text-red-700 font-black',
  medium:   'text-amber-800 font-black',
  low:      'text-emerald-800 font-black',
};

export default function ShipmentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: shipments, isLoading, isError, refetch } = useQuery({
    queryKey: ['shipments', statusFilter, riskFilter, search],
    queryFn: () => apiClient.get('/shipments', {
      params: {
        ...(statusFilter && { status: statusFilter }),
        ...(riskFilter && { risk_level: riskFilter }),
        ...(search && { search }),
        limit: 150,
      }
    }).then(r => r.data as Shipment[]),
    refetchInterval: 30_000,
  });

  const { data: selected } = useQuery({
    queryKey: ['shipment-detail', selectedId],
    queryFn: () => selectedId ? apiClient.get(`/shipments/${selectedId}`).then(r => r.data) : null,
    enabled: !!selectedId,
  });

  if (isLoading) return (
    <div className="flex items-center gap-3 p-8 text-stone-800 text-sm font-mono font-bold">
      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
      Loading live consignment telemetry...
    </div>
  );

  if (isError) return (
    <div className="p-8">
      <p className="text-red-700 text-sm font-bold mb-3">Failed to load shipments.</p>
      <button onClick={() => refetch()} className="text-xs font-black text-white bg-blue-600 px-4 py-2 rounded-xl shadow">
        Retry
      </button>
    </div>
  );

  const statusCounts = (shipments || []).reduce((acc: Record<string, number>, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]">
      {/* Main table container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Status summary pills */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(statusCounts).map(([status, count]) => {
            const isSelected = statusFilter === status;
            const cfg = statusConfig[status];

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(s => s === status ? '' : status)}
                className={`flex items-center gap-2 text-xs font-black font-mono px-3.5 py-1.5 rounded-xl border transition-all shadow-sm ${
                  isSelected
                    ? 'border-blue-600 bg-white text-blue-700 ring-2 ring-blue-600/30'
                    : 'border-white/50 bg-white/60 hover:bg-white text-stone-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg?.dot || 'bg-stone-500'}`} />
                <span>{cfg?.label || status}</span>
                <span className="bg-black/10 px-1.5 py-0.2 rounded text-[11px] font-bold text-stone-800">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search shipment code, carrier, route..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/80 border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-stone-950 font-black font-mono placeholder:text-stone-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-inner"
          />
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-white/80 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-950 font-black font-mono focus:outline-none focus:border-blue-600 shadow-inner"
          >
            <option value="">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <button
            onClick={() => { setStatusFilter(''); setRiskFilter(''); setSearch(''); }}
            className="text-xs font-black text-stone-800 bg-white/70 border border-stone-300 px-4 py-2.5 rounded-xl hover:bg-white shadow-sm transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Data Table */}
        <div className="flex-1 glass-panel border border-white/50 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-stone-300/80 shadow-sm">
                <tr>
                  {['Shipment', 'Origin → Dest', 'Carrier', 'Status', 'Planned ETA', 'Delay', 'Risk'].map(h => (
                    <th key={h} className="text-left p-3.5 text-stone-950 font-black text-[11px] font-mono uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/80">
                {(shipments || []).map(s => {
                  const isSelected = s.id === selectedId;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(isSelected ? null : s.id)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? 'bg-blue-600/15 font-black'
                          : 'hover:bg-white/80 bg-white/40'
                      }`}
                    >
                      <td className="p-3.5 font-mono text-stone-950 font-black whitespace-nowrap">
                        {s.shipment_code}
                      </td>
                      <td className="p-3.5 text-stone-900 font-bold whitespace-nowrap">
                        {s.origin_type} {s.origin_id} → {s.destination_type} {s.destination_id}
                      </td>
                      <td className="p-3.5 text-stone-950 font-black">
                        {s.carrier}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusConfig[s.status]?.dot || 'bg-stone-500'}`} />
                          <span className="text-stone-950 font-black">
                            {statusConfig[s.status]?.label || s.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-stone-900 font-bold whitespace-nowrap">
                        {s.planned_arrival ? new Date(s.planned_arrival).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="p-3.5 font-mono">
                        {s.delay_hours > 0
                          ? <span className="text-red-700 font-black">{s.delay_hours.toFixed(0)}h</span>
                          : <span className="text-stone-500 font-bold">—</span>}
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className={riskColor[s.risk_level || 'low'] || 'text-stone-800 font-bold'}>
                          {s.risk_level?.toUpperCase() || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="border-t border-stone-300/80 bg-white/70 px-4 py-2.5 text-xs text-stone-900 font-black font-mono flex items-center justify-between">
            <span>{(shipments || []).length} consignments actively monitored</span>
            <span className="text-stone-600 font-bold">Click any row to inspect telemetry & dispatch history</span>
          </div>
        </div>
      </div>

      {/* Side detail panel */}
      {selectedId && selected && (
        <div className="w-80 shrink-0 glass-panel bg-white/90 border border-white/60 rounded-2xl p-5 overflow-y-auto shadow-2xl animate-slide-up custom-scrollbar">
          <div className="flex justify-between items-start mb-4 pb-3 border-b border-stone-200">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-500 font-mono">Shipment Telemetry</div>
              <h3 className="text-base font-black text-stone-950 mt-0.5 font-mono">{selected.shipment_code}</h3>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-stone-700 hover:text-stone-950 text-xl font-bold leading-none"
            >
              &times;
            </button>
          </div>

          <div className="space-y-3 text-xs mb-5">
            <Detail label="Status">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusConfig[selected.status]?.dot}`} />
                <span className="font-black text-stone-950">{statusConfig[selected.status]?.label}</span>
              </div>
            </Detail>
            <Detail label="Carrier" value={selected.carrier} />
            <Detail label="Mode" value={selected.transport_mode?.toUpperCase()} />
            <Detail label="Quantity" value={`${selected.quantity?.toLocaleString()} units`} />
            <Detail label="Delay">
              <span className={selected.delay_hours > 0 ? 'text-red-700 font-black font-mono' : 'text-stone-700 font-bold'}>
                {selected.delay_hours > 0 ? `${selected.delay_hours} hours` : 'On Schedule'}
              </span>
            </Detail>
            <Detail label="Delay Probability">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{
                      width: `${(selected.delay_probability || 0) * 100}%`,
                      background: selected.delay_probability > 0.5 ? '#dc2626' : selected.delay_probability > 0.25 ? '#d97706' : '#059669',
                    }} />
                </div>
                <span className="font-black font-mono text-stone-900">{Math.round((selected.delay_probability || 0) * 100)}%</span>
              </div>
            </Detail>
            <Detail label="Current Location" value={selected.current_location_name || 'In Transit Corridor'} />
            <Detail label="Planned Arrival">
              <span className="font-mono font-bold text-stone-900">{selected.planned_arrival ? new Date(selected.planned_arrival).toLocaleString('en-IN') : '—'}</span>
            </Detail>
            {selected.predicted_arrival && selected.predicted_arrival !== selected.planned_arrival && (
              <Detail label="Predicted Arrival">
                <span className="font-mono text-amber-800 font-black">{new Date(selected.predicted_arrival).toLocaleString('en-IN')}</span>
              </Detail>
            )}
          </div>

          {/* Events timeline */}
          {selected.events && selected.events.length > 0 && (
            <div className="pt-3 border-t border-stone-200">
              <div className="text-[10px] font-black font-mono text-stone-600 uppercase tracking-wider mb-3">Telemetry Event Log</div>
              <div className="space-y-2.5">
                {selected.events.map((ev: any) => (
                  <div key={ev.id} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-1" />
                      <div className="flex-1 w-px bg-stone-300" />
                    </div>
                    <div className="pb-2.5">
                      <div className="text-xs font-black text-stone-950">{ev.description}</div>
                      <div className="text-[10px] text-stone-600 font-bold mt-0.5 font-mono">
                        {ev.location_name} · {ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-IN') : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, children }: { label: string; value?: string | number; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-stone-100">
      <span className="text-stone-700 font-bold text-xs">{label}</span>
      {children || <span className="text-stone-950 font-black text-xs font-mono">{value}</span>}
    </div>
  );
}
