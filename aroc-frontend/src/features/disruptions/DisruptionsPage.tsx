import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';

const severityConfig: Record<string, { label: string; classes: string }> = {
  critical: { label: 'CRITICAL', classes: 'text-red-800 bg-red-500/15 border-red-500/30' },
  high:     { label: 'HIGH',     classes: 'text-amber-800 bg-amber-500/15 border-amber-500/30' },
  medium:   { label: 'MEDIUM',   classes: 'text-blue-800 bg-blue-500/15 border-blue-500/30' },
  low:      { label: 'LOW',      classes: 'text-stone-800 bg-stone-500/15 border-stone-400/30' },
};

export default function DisruptionsPage() {
  const navigate = useNavigate();

  const { data: disruptions, isLoading, isError, refetch } = useQuery({
    queryKey: ['disruptions'],
    queryFn: () => apiClient.get('/disruptions').then(r => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return (
    <div className="flex items-center gap-3 p-8 text-stone-900 text-sm font-mono font-bold">
      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
      Loading disruption registry...
    </div>
  );
  if (isError) return (
    <div className="p-8">
      <p className="text-red-700 text-sm font-bold mb-3">Failed to load disruption data.</p>
      <button onClick={() => refetch()} className="text-xs font-black text-white bg-blue-600 px-4 py-2 rounded-xl shadow">Retry</button>
    </div>
  );

  const active = (disruptions || []).filter((d: any) => d.status === 'active');
  const resolved = (disruptions || []).filter((d: any) => d.status !== 'active');
  const totalExposure = (disruptions || []).reduce((s: number, d: any) => s + (d.financial_exposure || 0), 0);

  return (
    <div className="max-w-[1000px] space-y-6">
      {/* Summary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel border border-white/50 rounded-2xl p-5 shadow-lg">
          <span className="text-stone-600 font-extrabold uppercase tracking-wider text-[11px]">Active Disruptions</span>
          <div className="text-3xl font-black text-amber-700 mt-1">{active.length}</div>
        </div>
        <div className="glass-panel border border-white/50 rounded-2xl p-5 shadow-lg">
          <span className="text-stone-600 font-extrabold uppercase tracking-wider text-[11px]">Resolved Events</span>
          <div className="text-3xl font-black text-emerald-800 mt-1">{resolved.length}</div>
        </div>
        <div className="glass-panel border border-white/50 rounded-2xl p-5 shadow-lg">
          <span className="text-stone-600 font-extrabold uppercase tracking-wider text-[11px]">Total Exposure</span>
          <div className="text-3xl font-black text-red-700 mt-1 font-mono">
            ₹{totalExposure.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Active Disruptions */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-stone-800">Live Active Disruptions</h3>
          <div className="space-y-3">
            {active.map((d: any) => {
              const sev = severityConfig[d.severity] || severityConfig.medium;

              return (
                <div
                  key={d.id}
                  className="glass-panel bg-white/80 hover:bg-white/95 border border-white/60 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${sev.classes}`}>
                        {sev.label}
                      </span>
                      <span className="text-xs font-mono font-black text-stone-600 uppercase">
                        {d.disruption_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-mono font-bold text-stone-500">
                        &bull; Started {new Date(d.started_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-stone-950">{d.title}</h4>
                    <p className="text-xs font-semibold text-stone-700 mt-1 leading-relaxed">{d.description}</p>

                    <div className="flex items-center gap-4 mt-3 text-xs font-bold text-stone-800">
                      {d.estimated_delay_hours && (
                        <span>Est. Delay: <strong className="text-red-700 font-mono font-black">{d.estimated_delay_hours}h</strong></span>
                      )}
                      {d.financial_exposure && (
                        <span>Exposure: <strong className="text-red-700 font-mono font-black">₹{d.financial_exposure.toLocaleString('en-IN')}</strong></span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/simulation')}
                    className="shrink-0 px-4 py-2 text-xs font-black rounded-xl bg-stone-900 text-white hover:bg-black transition-all shadow-md"
                  >
                    Simulate Impact &rarr;
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Resolved Disruptions */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-stone-700">Resolved Incident History</h3>
          <div className="space-y-2.5">
            {resolved.map((d: any) => (
              <div key={d.id} className="glass-panel bg-white/50 border border-white/40 rounded-xl p-4 flex items-center justify-between text-xs text-stone-800 font-bold">
                <div>
                  <span className="font-black text-stone-950">{d.title}</span>
                  <span className="text-stone-500 ml-2">&bull; {d.disruption_type}</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800">Resolved</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
