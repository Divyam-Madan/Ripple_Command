import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';

const severityConfig: Record<string, { label: string; classes: string }> = {
  critical: { label: 'CRITICAL', classes: 'text-status-critical bg-red-950/30 border-red-900/40' },
  high:     { label: 'HIGH',     classes: 'text-status-warning bg-amber-950/30 border-amber-900/40' },
  medium:   { label: 'MEDIUM',  classes: 'text-accent bg-blue-950/30 border-blue-900/40' },
  low:      { label: 'LOW',     classes: 'text-text-secondary bg-surface-3 border-border' },
};

export default function DisruptionsPage() {
  const navigate = useNavigate();

  const { data: disruptions, isLoading, isError, refetch } = useQuery({
    queryKey: ['disruptions'],
    queryFn: () => apiClient.get('/disruptions').then(r => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return (
    <div className="flex items-center gap-3 p-8 text-text-secondary text-sm font-mono">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      Loading disruption registry...
    </div>
  );
  if (isError) return (
    <div className="p-8">
      <p className="text-status-critical text-sm mb-3">Failed to load disruption data.</p>
      <button onClick={() => refetch()} className="text-xs text-accent border border-border px-3 py-1.5 rounded-sm">Retry</button>
    </div>
  );

  const active = (disruptions || []).filter((d: any) => d.status === 'active');
  const resolved = (disruptions || []).filter((d: any) => d.status !== 'active');

  return (
    <div className="max-w-[1000px] space-y-6">
      {/* Summary row */}
      <div className="flex gap-4">
        <div className="bg-surface-2 border border-border rounded-sm px-4 py-3 text-sm">
          <span className="text-text-tertiary font-mono text-xs">Active</span>
          <div className="text-xl font-bold text-status-warning mt-0.5">{active.length}</div>
        </div>
        <div className="bg-surface-2 border border-border rounded-sm px-4 py-3 text-sm">
          <span className="text-text-tertiary font-mono text-xs">Resolved</span>
          <div className="text-xl font-bold text-status-healthy mt-0.5">{resolved.length}</div>
        </div>
        <div className="bg-surface-2 border border-border rounded-sm px-4 py-3 text-sm">
          <span className="text-text-tertiary font-mono text-xs">Total Exposure</span>
          <div className="text-xl font-bold text-status-critical mt-0.5 font-mono">
            ₹{(disruptions || []).reduce((s: number, d: any) => s + (d.financial_exposure || 0), 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Active Disruptions */}
      {active.length > 0 && (
        <section>
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-tertiary mb-3">Active Disruptions</h3>
          <div className="space-y-2">
            {active.map((d: any) => <DisruptionCard key={d.id} disruption={d} onSimulate={() => navigate('/simulation')} />)}
          </div>
        </section>
      )}

      {active.length === 0 && (
        <div className="bg-surface-2 border border-border rounded-sm p-8 text-center">
          <div className="text-status-healthy text-sm mb-1">No active disruptions</div>
          <div className="text-text-tertiary text-xs font-mono">Supply chain operating within normal parameters.</div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <h3 className="text-xs font-mono uppercase tracking-widest text-text-tertiary mb-3">Resolved / Historical</h3>
          <div className="space-y-2">
            {resolved.map((d: any) => <DisruptionCard key={d.id} disruption={d} onSimulate={() => navigate('/simulation')} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function DisruptionCard({ disruption: d, onSimulate }: { disruption: any; onSimulate: () => void }) {
  const sev = severityConfig[d.severity] || severityConfig.low;
  return (
    <div className="bg-surface-2 border border-border rounded-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-mono px-2 py-0.5 rounded-sm border ${sev.classes}`}>
              {sev.label}
            </span>
            <span className="text-xs font-mono text-text-tertiary">{d.disruption_type?.replace(/_/g, ' ')}</span>
            <span className={`text-xs font-mono ml-auto ${d.status === 'active' ? 'text-status-warning' : 'text-status-healthy'}`}>
              {d.status?.toUpperCase()}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-text-primary">{d.title}</h4>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">{d.description}</p>
          <div className="flex gap-4 mt-2 text-xs font-mono">
            {d.estimated_delay_hours > 0 && (
              <span className="text-text-secondary">Delay: <span className="text-status-warning">{d.estimated_delay_hours}h</span></span>
            )}
            {d.financial_exposure > 0 && (
              <span className="text-text-secondary">Exposure: <span className="text-status-critical">₹{d.financial_exposure?.toLocaleString('en-IN')}</span></span>
            )}
            {d.started_at && (
              <span className="text-text-tertiary">
                {new Date(d.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        {d.status === 'active' && (
          <button
            onClick={onSimulate}
            className="shrink-0 text-xs font-mono text-accent border border-accent/30 px-3 py-1.5 rounded-sm hover:bg-blue-950/20 transition-colors"
          >
            Simulate
          </button>
        )}
      </div>
    </div>
  );
}
