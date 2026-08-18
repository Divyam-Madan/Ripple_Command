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
  critical:      'text-status-critical bg-red-950/40 border border-red-900/40',
  high:          'text-status-warning bg-amber-950/40 border border-amber-900/40',
  medium:        'text-accent bg-blue-950/40 border border-blue-900/40',
  informational: 'text-text-secondary bg-surface-3 border border-border',
};

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  topColor: string;
}
function KPICard({ label, value, unit, topColor }: KPICardProps) {
  return (
    <div className="bg-surface-2 border border-border p-4 rounded-sm"
         style={{ borderTop: `2px solid ${topColor}` }}>
      <div className="text-text-tertiary text-xs font-mono uppercase tracking-widest mb-3">{label}</div>
      <div className="text-2xl font-bold text-text-primary leading-none">
        {value}
        {unit && <span className="text-sm font-normal text-text-secondary ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function HealthScore({ score }: { score: number }) {
  const color = score > 85 ? '#4ade80' : score > 65 ? '#f59e0b' : '#ef4444';
  return (
    <div className="bg-surface-2 border border-border p-4 rounded-sm"
         style={{ borderTop: `2px solid ${color}` }}>
      <div className="text-text-tertiary text-xs font-mono uppercase tracking-widest mb-3">Supply Chain Health</div>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-text-secondary text-sm mb-1">/ 100</span>
      </div>
      <div className="mt-3 h-1 bg-surface-3 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${score}%`, background: color }} />
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
    return <div className="flex items-center gap-3 p-8 text-text-secondary text-sm font-mono">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      Loading network state...
    </div>;
  }
  if (kpisError) {
    return <div className="p-8">
      <p className="text-status-critical text-sm mb-3">Failed to load dashboard data.</p>
      <button onClick={() => refetch()} className="text-xs text-accent border border-border px-3 py-1.5 rounded-sm hover:bg-surface-2 transition-colors">
        Retry Connection
      </button>
    </div>;
  }

  const k = kpis!;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Hero Banner */}
      <div className="relative h-48 bg-surface-2 border border-border rounded-sm overflow-hidden mb-6 flex flex-col justify-center px-8">
        <RippleHero />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>AROC Platform</h1>
          <p className="text-sm font-mono text-text-secondary" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
            Autonomous Resilient Operations Center<br />
            Predict. Simulate. Prescribe.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-3">
        <div className="col-span-2 xl:col-span-1">
          <HealthScore score={k.health_score} />
        </div>
        <KPICard label="Active Shipments"   value={k.active_shipments}  topColor="#3b82f6" />
        <KPICard label="At-Risk Shipments"  value={k.at_risk_shipments} topColor={k.at_risk_shipments > 0 ? '#f59e0b' : '#4ade80'} />
        <KPICard label="Critical Suppliers" value={k.critical_suppliers} topColor={k.critical_suppliers > 0 ? '#ef4444' : '#4ade80'} />
        <KPICard label="Projected Stockouts" value={k.projected_stockouts} topColor={k.projected_stockouts > 0 ? '#ef4444' : '#4ade80'} />
        <KPICard label="Production at Risk"  value={k.production_at_risk} unit="line(s)" topColor={k.production_at_risk > 0 ? '#ef4444' : '#4ade80'} />
        <div className="col-span-2">
          <KPICard label="Financial Exposure" value={`₹${(k.financial_exposure / 1_00_000).toFixed(1)}L`} topColor="#ef4444" />
        </div>
        <KPICard label="Active Disruptions" value={k.active_disruptions} topColor={k.active_disruptions > 0 ? '#f59e0b' : '#4ade80'} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Disruptions + Watchlist */}
        <div className="col-span-2 space-y-5">

          {/* Disruption Feed */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Active Disruption Feed</h3>
              {k.active_disruptions > 0 && (
                <span className="text-xs font-mono text-status-warning">{k.active_disruptions} active</span>
              )}
            </div>
            <div className="space-y-2">
              {(alerts || []).filter(a => !a.is_read && a.severity !== 'informational').slice(0, 5).map(alert => (
                <div key={alert.id} className="bg-surface-2 border border-border rounded-sm p-3 flex items-start gap-3">
                  <div className="mt-0.5">
                    <span className={`inline-block text-xs font-mono px-2 py-0.5 rounded-sm ${severityBadge[alert.severity]}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{alert.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{alert.description}</p>
                  </div>
                  <button
                    onClick={() => navigate('/simulation')}
                    className="text-xs text-accent hover:text-blue-400 font-mono whitespace-nowrap"
                  >
                    Simulate
                  </button>
                </div>
              ))}
              {(!alerts || alerts.filter(a => !a.is_read && a.severity !== 'informational').length === 0) && (
                <div className="bg-surface-2 border border-border rounded-sm p-4 text-sm text-text-secondary">
                  No active disruptions detected. Network operating normally.
                </div>
              )}
            </div>
          </section>

          {/* Shipment Watchlist */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Shipment Watchlist</h3>
              <button onClick={() => navigate('/shipments')} className="text-xs text-accent font-mono">
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
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">Financial Exposure</h3>
            <div className="bg-surface-2 border border-border rounded-sm p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary font-mono">Gross Exposure</span>
                <span className="text-sm font-mono text-status-critical">₹{k.financial_exposure.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary font-mono">Recoverable</span>
                <span className="text-sm font-mono text-status-healthy">~₹{Math.round(k.financial_exposure * 0.7).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary font-mono">Net Exposure</span>
                <span className="text-sm font-mono text-status-warning">₹{Math.round(k.financial_exposure * 0.3).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => navigate('/simulation')}
                className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border rounded-sm p-3 transition-colors">
                <div className="text-sm font-medium text-text-primary">Run Disruption Simulation</div>
                <div className="text-xs text-text-secondary mt-0.5">Model S3 delay → cascade impact</div>
              </button>
              <button onClick={() => navigate('/digital-twin')}
                className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border rounded-sm p-3 transition-colors">
                <div className="text-sm font-medium text-text-primary">View Digital Twin</div>
                <div className="text-xs text-text-secondary mt-0.5">Interactive topology + geographic map</div>
              </button>
              <button onClick={() => navigate('/scenarios')}
                className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border rounded-sm p-3 transition-colors">
                <div className="text-sm font-medium text-text-primary">Load Scenario</div>
                <div className="text-xs text-text-secondary mt-0.5">8 pre-built supply chain scenarios</div>
              </button>
            </div>
          </section>

          {/* Alert summary */}
          {alerts && alerts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">Recent Alerts</h3>
              <div className="space-y-1.5">
                {alerts.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 shrink-0 inline-block w-1.5 h-1.5 rounded-full ${
                      a.severity === 'critical' ? 'bg-status-critical' :
                      a.severity === 'high' ? 'bg-status-warning' :
                      a.severity === 'medium' ? 'bg-accent' : 'bg-text-tertiary'
                    }`} />
                    <span className="text-text-secondary line-clamp-2">{a.title}</span>
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

  if (isLoading) return <div className="text-xs text-text-secondary font-mono p-3">Loading shipment data...</div>;
  if (!all.length) return (
    <div className="bg-surface-2 border border-border rounded-sm p-4 text-sm text-text-secondary">
      All monitored shipments are within acceptable parameters.
    </div>
  );

  const statusStyle: Record<string, string> = {
    at_risk: 'text-status-warning',
    delayed: 'text-status-critical',
    in_transit: 'text-accent',
    pending: 'text-text-secondary',
  };

  return (
    <div className="bg-surface-2 border border-border rounded-sm overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-3 text-text-tertiary font-mono uppercase tracking-wider">Shipment</th>
            <th className="text-left p-3 text-text-tertiary font-mono uppercase tracking-wider">Status</th>
            <th className="text-left p-3 text-text-tertiary font-mono uppercase tracking-wider">Delay</th>
            <th className="text-left p-3 text-text-tertiary font-mono uppercase tracking-wider">Risk</th>
          </tr>
        </thead>
        <tbody>
          {all.map((s: any) => (
            <tr key={s.id} className="border-b border-border/50 hover:bg-surface-3 transition-colors">
              <td className="p-3 font-mono text-text-primary">{s.shipment_code}</td>
              <td className="p-3">
                <span className={`font-mono ${statusStyle[s.status] || 'text-text-secondary'}`}>
                  {s.status.replace('_', ' ')}
                </span>
              </td>
              <td className="p-3 font-mono text-text-secondary">
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
