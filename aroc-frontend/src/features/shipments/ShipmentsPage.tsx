import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Shipment } from '@/types';

const statusConfig: Record<string, { dot: string; label: string }> = {
  in_transit: { dot: 'bg-accent',          label: 'In Transit' },
  delayed:    { dot: 'bg-status-critical', label: 'Delayed' },
  at_risk:    { dot: 'bg-status-warning',  label: 'At Risk' },
  delivered:  { dot: 'bg-status-healthy',  label: 'Delivered' },
  pending:    { dot: 'bg-text-tertiary',   label: 'Pending' },
  cancelled:  { dot: 'bg-text-tertiary',   label: 'Cancelled' },
};
const riskColor: Record<string, string> = {
  high:     'text-status-critical',
  critical: 'text-status-critical',
  medium:   'text-status-warning',
  low:      'text-status-healthy',
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
    <div className="flex items-center gap-3 p-8 text-stone-300 text-sm font-mono">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      Loading shipment data...
    </div>
  );
  if (isError) return (
    <div className="p-8">
      <p className="text-status-critical text-sm mb-3">Failed to load shipments.</p>
      <button onClick={() => refetch()} className="text-xs text-blue-700 border border-border px-3 py-1.5 rounded-sm">Retry</button>
    </div>
  );

  const statusCounts = (shipments || []).reduce((acc: Record<string, number>, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]">
      {/* Main table */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Status summary pills */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(s => s === status ? '' : status)}
              className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm border transition-colors ${
                statusFilter === status
                  ? 'border-accent bg-blue-950/30 text-blue-700'
                  : 'border-border bg-surface-2 text-stone-300 hover:border-border/70'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[status]?.dot || 'bg-text-tertiary'}`} />
              {statusConfig[status]?.label || status} ({count})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search shipment code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 font-mono focus:outline-none focus:border-accent"
          />
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-stone-300 font-mono focus:outline-none focus:border-accent"
          >
            <option value="">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <button onClick={() => { setStatusFilter(''); setRiskFilter(''); setSearch(''); }}
            className="text-xs text-stone-300 border border-border px-3 py-2 rounded-sm hover:bg-surface-2">
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 bg-surface-2 border border-border rounded-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-3">
                <tr className="border-b border-border">
                  {['Shipment', 'Origin → Dest', 'Carrier', 'Status', 'Planned ETA', 'Delay', 'Risk'].map(h => (
                    <th key={h} className="text-left p-3 text-stone-400 font-mono uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(shipments || []).map(s => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                    className={`border-b border-border/40 cursor-pointer transition-colors ${
                      s.id === selectedId ? 'bg-surface-3' : 'hover:bg-surface-1'
                    }`}
                  >
                    <td className="p-3 font-mono text-stone-100 whitespace-nowrap">{s.shipment_code}</td>
                    <td className="p-3 text-stone-300 whitespace-nowrap">
                      {s.origin_type} {s.origin_id} → {s.destination_type} {s.destination_id}
                    </td>
                    <td className="p-3 text-stone-300">{s.carrier}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[s.status]?.dot || 'bg-text-tertiary'}`} />
                        <span className="text-stone-100">{statusConfig[s.status]?.label || s.status}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-stone-300 whitespace-nowrap">
                      {s.planned_arrival ? new Date(s.planned_arrival).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="p-3 font-mono">
                      {s.delay_hours > 0
                        ? <span className="text-status-critical">{s.delay_hours.toFixed(0)}h</span>
                        : <span className="text-stone-400">—</span>}
                    </td>
                    <td className="p-3 font-mono">
                      <span className={riskColor[s.risk_level || 'low'] || 'text-stone-300'}>
                        {s.risk_level || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-2 text-xs text-stone-400 font-mono">
            {(shipments || []).length} shipments shown
          </div>
        </div>
      </div>

      {/* Side detail panel */}
      {selectedId && selected && (
        <div className="w-80 shrink-0 bg-surface-2 border border-border rounded-sm p-4 overflow-y-auto">
          <div className="flex justify-between mb-4">
            <div>
              <div className="text-xs font-mono text-stone-400">Shipment Detail</div>
              <h3 className="text-sm font-semibold text-stone-100 mt-0.5 font-mono">{selected.shipment_code}</h3>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-stone-400 text-lg">&times;</button>
          </div>

          <div className="space-y-3 text-xs mb-5">
            <Detail label="Status">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[selected.status]?.dot}`} />
                <span>{statusConfig[selected.status]?.label}</span>
              </div>
            </Detail>
            <Detail label="Carrier" value={selected.carrier} />
            <Detail label="Mode" value={selected.transport_mode} />
            <Detail label="Quantity" value={selected.quantity?.toLocaleString()} />
            <Detail label="Delay">
              <span className={selected.delay_hours > 0 ? 'text-status-critical font-mono' : 'text-stone-300'}>
                {selected.delay_hours > 0 ? `${selected.delay_hours}h` : '—'}
              </span>
            </Detail>
            <Detail label="Delay Probability">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{
                      width: `${(selected.delay_probability || 0) * 100}%`,
                      background: selected.delay_probability > 0.5 ? '#ef4444' : selected.delay_probability > 0.25 ? '#f59e0b' : '#4ade80',
                    }} />
                </div>
                <span className="font-mono">{Math.round((selected.delay_probability || 0) * 100)}%</span>
              </div>
            </Detail>
            <Detail label="Current Location" value={selected.current_location_name || '—'} />
            <Detail label="Planned Arrival">
              <span className="font-mono">{selected.planned_arrival ? new Date(selected.planned_arrival).toLocaleString('en-IN') : '—'}</span>
            </Detail>
            {selected.predicted_arrival && selected.predicted_arrival !== selected.planned_arrival && (
              <Detail label="Predicted Arrival">
                <span className="font-mono text-status-warning">{new Date(selected.predicted_arrival).toLocaleString('en-IN')}</span>
              </Detail>
            )}
          </div>

          {/* Events timeline */}
          {selected.events && selected.events.length > 0 && (
            <div>
              <div className="text-xs font-mono text-stone-400 uppercase tracking-wider mb-3">Event Timeline</div>
              <div className="space-y-2">
                {selected.events.map((ev: any) => (
                  <div key={ev.id} className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1" />
                      <div className="flex-1 w-px bg-border" />
                    </div>
                    <div className="pb-3">
                      <div className="text-stone-100">{ev.description}</div>
                      <div className="text-stone-400 mt-0.5">
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
    <div className="flex justify-between items-center">
      <span className="text-stone-400">{label}</span>
      {children || <span className="text-stone-100">{value}</span>}
    </div>
  );
}
