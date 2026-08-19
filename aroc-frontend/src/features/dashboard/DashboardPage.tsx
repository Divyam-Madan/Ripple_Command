import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';
import type { DashboardKPIs, Alert } from '@/types';
import RippleHero from '@/components/RippleHero';

function getDashboardKPIs(): Promise<DashboardKPIs> {
  return apiClient.get('/dashboard/kpis').then(r => r.data);
}

function getAlerts(): Promise<Alert[]> {
  return apiClient.get('/dashboard/alerts').then(r => r.data);
}

const severityBadge: Record<string, string> = {
  critical:      'text-status-critical bg-red-500/10 border border-red-500/20',
  high:          'text-status-warning bg-amber-500/10 border border-amber-500/20',
  medium:        'text-blue-600 bg-blue-500/10 border border-blue-500/20',
  informational: 'text-stone-700 bg-black/5 border border-black/10',
};

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  topColor: string;
  delay?: string;
}
function KPICard({ label, value, unit, topColor, delay = '0ms' }: KPICardProps) {
  return (
    <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 animate-slide-up" style={{ animationDelay: delay }}>
      <div className="absolute top-0 left-0 w-full h-[2px] opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${topColor}, transparent)` }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ background: `radial-gradient(circle at top right, ${topColor}, transparent)` }} />
      
      <div className="text-stone-700 text-[11px] font-bold uppercase tracking-widest mb-4">{label}</div>
      <div className="text-3xl font-black text-stone-900 leading-none tracking-tight">
        {value}
        {unit && <span className="text-sm font-bold text-stone-600 ml-1 tracking-normal">{unit}</span>}
      </div>
    </div>
  );
}

function HealthScore({ score, delay = '0ms' }: { score: number, delay?: string }) {
  const color = score > 85 ? '#10b981' : score > 65 ? '#f59e0b' : '#ef4444';
  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 animate-slide-up" style={{ animationDelay: delay }}>
      <div className="absolute top-0 left-0 w-full h-[2px] opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      
      <div className="text-stone-700 text-[11px] font-bold uppercase tracking-widest mb-4">Supply Chain Health</div>
      <div className="flex items-end gap-3 mb-5">
        <span className="text-5xl font-black leading-none tracking-tighter" style={{ color, textShadow: `0 0 20px ${color}40` }}>{score}</span>
        <span className="text-stone-600 text-sm font-bold mb-1 tracking-wide">/ 100</span>
      </div>
      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden shadow-inner relative">
        <div className="absolute inset-0 bg-black/10" />
        <div className="h-full rounded-full transition-all duration-1000 ease-out relative z-10"
             style={{ width: `${score}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading, isError: kpisError, refetch } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: getDashboardKPIs,
    refetchInterval: 30_000,
  });
  const { data: alerts } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: getAlerts,
    refetchInterval: 60_000,
  });

  if (kpisLoading) {
    return <div className="flex items-center gap-3 p-8 text-stone-700 text-sm font-mono">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      Loading network state...
    </div>;
  }
  if (kpisError) {
    return <div className="p-8">
      <p className="text-status-critical text-sm mb-3">Failed to load dashboard data.</p>
      <button onClick={() => refetch()} className="text-xs text-blue-700 border border-border px-3 py-1.5 rounded-sm hover:bg-white/30 transition-colors">
        Retry Connection
      </button>
    </div>;
  }

  const k = kpis!;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Hero Banner */}
      <div className="relative h-56 glass-panel rounded-3xl overflow-hidden mb-8 flex flex-col justify-center px-10 shadow-lg animate-fade-in group">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-white/10 mix-blend-overlay pointer-events-none" />
        <RippleHero />
        <div className="relative z-10 animate-slide-up">
          <h1 className="text-4xl font-black tracking-tight text-stone-900 mb-2 drop-shadow-sm" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
            Global Operations Center
          </h1>
          <p className="text-sm font-bold text-stone-800 uppercase tracking-widest max-w-xl">
            Predictive Twin &bull; Scenario Engine
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-3">
        <div className="col-span-2 xl:col-span-1">
          <HealthScore score={k.health_score} delay="0ms" />
        </div>
        <div className="col-span-2 xl:col-span-1">
          <KPICard label="Active Shipments" value={k.active_shipments} topColor="#3b82f6" delay="100ms" />
        </div>
        <div className="col-span-2 xl:col-span-1">
          <KPICard label="At Risk" value={k.at_risk_shipments} topColor="#f59e0b" delay="200ms" />
        </div>
        <div className="col-span-2 xl:col-span-1">
          <KPICard label="Projected Stockouts" value={k.projected_stockouts} topColor="#ef4444" delay="300ms" />
        </div>
        <div className="col-span-2 xl:col-span-1">
          <KPICard label="Financial Exp." value={(k.financial_exposure / 1000000).toFixed(1)} unit="M" topColor="#ef4444" delay="400ms" />
        </div>
        <div className="col-span-2 xl:col-span-1">
          <KPICard label="Active Disruptions" value={k.active_disruptions} topColor="#f59e0b" delay="500ms" />
        </div>
        <div className="col-span-4 xl:col-span-2">
          <KPICard label="Critical Suppliers" value={k.critical_suppliers} topColor="#a78bfa" delay="600ms" />
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Disruptions + Watchlist */}
        <div className="col-span-2 space-y-5">

          {/* Disruption Feed */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Active Disruption Feed</h3>
              {k.active_disruptions > 0 && (
                <span className="text-xs font-bold text-stone-600">{k.active_disruptions} active</span>
              )}
            </div>
            <div className="space-y-2">
              {(alerts || []).filter(a => !a.is_read && a.severity !== 'informational').slice(0, 5).map((alert, i) => (
                <div key={alert.id} className="glass-panel rounded-xl p-4 flex items-start gap-4 group hover:bg-white/[0.02] transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 100 + 700}ms` }}>
                  <div className="mt-0.5">
                    <span className={`inline-block text-[10px] font-black tracking-widest px-2 py-1 rounded ${severityBadge[alert.severity]}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">{alert.title}</p>
                    <p className="text-xs text-stone-700 mt-1 line-clamp-2 leading-relaxed font-medium">{alert.description}</p>
                  </div>
                  <button
                    onClick={() => navigate('/simulation')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors whitespace-nowrap border border-blue-500/20 shadow-sm"
                  >
                    Simulate
                  </button>
                </div>
              ))}
              {(!alerts || alerts.filter(a => !a.is_read && a.severity !== 'informational').length === 0) && (
                <div className="glass-panel border border-white/40 rounded-xl p-4 text-sm text-stone-700 font-bold shadow-sm">
                  No active disruptions detected. Network operating normally.
                </div>
              )}
            </div>
          </section>

          {/* Shipment Watchlist */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Shipment Watchlist</h3>
              <button onClick={() => navigate('/shipments')} className="text-xs text-blue-600 font-bold hover:underline">
                View All
              </button>
            </div>
            <AtRiskShipments />
          </section>
        </div>

        {/* Right: Risk entities + Financial + Quick actions */}
        <div className="col-span-1 space-y-5">

          {/* Financial Summary */}
          <section>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">Financial Exposure</h3>
            <div className="glass-panel border border-white/40 rounded-xl p-5 space-y-4 animate-slide-up hover:scale-[1.02] transition-transform duration-300" style={{ animationDelay: '700ms' }}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-700 font-bold uppercase tracking-wider">Gross Exposure</span>
                <span className="text-sm font-mono text-status-critical font-black">₹{k.financial_exposure.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-px bg-white/40" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-700 font-bold uppercase tracking-wider">Recoverable</span>
                <span className="text-sm font-mono text-status-healthy font-black">~₹{Math.round(k.financial_exposure * 0.7).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-700 font-bold uppercase tracking-wider">Net Exposure</span>
                <span className="text-sm font-mono text-status-warning font-black">₹{Math.round(k.financial_exposure * 0.3).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="animate-slide-up" style={{ animationDelay: '800ms' }}>
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => navigate('/simulation')}
                className="w-full text-left glass-panel hover:bg-white/[0.6] rounded-xl p-4 transition-all duration-300 group">
                <div className="text-sm font-semibold text-stone-900 group-hover:text-blue-700 transition-colors">Run Disruption Simulation</div>
                <div className="text-xs text-stone-700 mt-1">Model S3 delay → cascade impact</div>
              </button>
              <button onClick={() => navigate('/digital-twin')}
                className="w-full text-left glass-panel hover:bg-white/[0.6] rounded-xl p-4 transition-all duration-300 group">
                <div className="text-sm font-semibold text-stone-900 group-hover:text-blue-700 transition-colors">View Digital Twin</div>
                <div className="text-xs text-stone-700 mt-1">Interactive topology + geographic map</div>
              </button>
              <button onClick={() => navigate('/scenarios')}
                className="w-full text-left glass-panel hover:bg-white/[0.6] rounded-xl p-4 transition-all duration-300 group">
                <div className="text-sm font-semibold text-stone-900 group-hover:text-blue-700 transition-colors">Load Scenario</div>
                <div className="text-xs text-stone-700 mt-1">8 pre-built supply chain scenarios</div>
              </button>
            </div>
          </section>

          {/* Alert summary */}
          {alerts && alerts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">Recent Alerts</h3>
              <div className="space-y-1.5">
                {alerts.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 shrink-0 inline-block w-1.5 h-1.5 rounded-full ${
                      a.severity === 'critical' ? 'bg-status-critical' :
                      a.severity === 'high' ? 'bg-status-warning' :
                      a.severity === 'medium' ? 'bg-accent' : 'bg-text-tertiary'
                    }`} />
                    <span className="text-stone-700 line-clamp-2">{a.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component for at-risk shipments table
function AtRiskShipments() {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments-atrisk'],
    queryFn: () => apiClient.get('/shipments', { params: { status: 'at_risk', limit: 5 } }).then(r => r.data),
    refetchInterval: 60_000,
  });
  const { data: delayed } = useQuery({
    queryKey: ['shipments-delayed'],
    queryFn: () => apiClient.get('/shipments', { params: { status: 'delayed', limit: 5 } }).then(r => r.data),
  });

  const all = [...(shipments || []), ...(delayed || [])].slice(0, 8);

  if (isLoading) return <div className="text-xs text-stone-700 font-mono p-3">Loading shipment data...</div>;
  if (!all.length) return (
    <div className="bg-surface-2 border border-border rounded-sm p-4 text-sm text-stone-700">
      All monitored shipments are within acceptable parameters.
    </div>
  );

  const statusStyle: Record<string, string> = {
    at_risk: 'text-status-warning font-bold',
    delayed: 'text-status-critical font-bold',
    in_transit: 'text-blue-600 font-bold',
    pending: 'text-stone-500 font-bold',
  };

  return (
    <div className="glass-panel border border-white/40 rounded-xl overflow-hidden shadow-sm animate-slide-up" style={{ animationDelay: '900ms' }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/20">
            <th className="text-left p-4 text-stone-700 font-bold uppercase tracking-wider">Shipment</th>
            <th className="text-left p-4 text-stone-700 font-bold uppercase tracking-wider">Status</th>
            <th className="text-left p-4 text-stone-700 font-bold uppercase tracking-wider">Delay</th>
            <th className="text-left p-4 text-stone-700 font-bold uppercase tracking-wider">Risk</th>
          </tr>
        </thead>
        <tbody>
          {all.map((s: any) => (
            <tr key={s.id} className="border-b border-white/10 hover:bg-white/[0.2] transition-colors">
              <td className="p-4 font-mono text-stone-900 font-bold">{s.shipment_code}</td>
              <td className="p-4">
                <span className={`font-mono ${statusStyle[s.status] || 'text-stone-500'}`}>
                  {s.status.replace('_', ' ')}
                </span>
              </td>
              <td className="p-3 font-mono text-stone-700">
                {s.delay_hours > 0 ? `${s.delay_hours}h` : '—'}
              </td>
              <td className="p-3">
                <span className={`font-mono ${
                  s.risk_level === 'high' || s.risk_level === 'critical' ? 'text-status-critical' :
                  s.risk_level === 'medium' ? 'text-status-warning' : 'text-status-healthy'
                }`}>{s.risk_level || '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
