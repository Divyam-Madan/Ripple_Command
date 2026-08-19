import { useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';
import { useSimulationStore } from '@/stores/simulationStore';
import type { SimulationResult, RecoveryOption, ImpactNode } from '@/types';

function getSuppliers() {
  return apiClient.get('/entities/suppliers').then(r => r.data);
}
function getScenarios() {
  return apiClient.get('/scenarios').then(r => r.data);
}
function runSimulation(payload: { supplier_id: number; disruption_type: string; delay_hours: number }) {
  return apiClient.post('/simulations/run', payload).then(r => r.data as SimulationResult);
}
function runOptimize(runId: number) {
  return apiClient.post(`/optimization/${runId}/optimize`).then(r => r.data as RecoveryOption[]);
}

const disruptionTypes = [
  { value: 'supplier_delay',  label: 'Supplier Delay' },
  { value: 'shipment_delay',  label: 'Shipment Delay' },
  { value: 'truck_breakdown', label: 'Truck Breakdown' },
  { value: 'route_closure',   label: 'Route Closure' },
  { value: 'weather_disruption', label: 'Weather Event' },
  { value: 'port_congestion', label: 'Port Congestion' },
];

const severityColors: Record<string, string> = {
  critical: 'border-l-status-critical text-status-critical',
  high:     'border-l-status-warning text-status-warning',
  medium:   'border-l-accent text-blue-700',
  low:      'border-l-status-healthy text-status-healthy',
};
const severityBg: Record<string, string> = {
  critical: 'bg-red-500/10',
  high:     'bg-amber-500/10',
  medium:   'bg-blue-500/10',
  low:      'bg-emerald-500/10',
};

function ImpactNodeCard({ node, index }: { node: ImpactNode; index: number }) {
  return (
    <div className={`border-l-4 pl-4 py-3 rounded-lg ${severityColors[node.severity]} ${severityBg[node.severity]} pr-3`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-stone-500 uppercase">{node.node_type}</span>
            <span className="text-xs font-mono text-stone-500">#{index + 1}</span>
          </div>
          <h4 className="text-sm font-semibold text-stone-900 mt-0.5">{node.node_name}</h4>
          <p className="text-xs text-stone-700 mt-1 leading-relaxed">{node.reason}</p>
        </div>
        <div className="text-right ml-3 shrink-0">
          {node.financial_impact > 0 && (
            <div className="text-xs font-mono text-status-critical">₹{node.financial_impact.toLocaleString('en-IN')}</div>
          )}
          {node.delay_hours > 0 && (
            <div className="text-xs font-mono text-stone-700 mt-0.5">{node.delay_hours.toFixed(1)}h delay</div>
          )}
          {node.production_loss_hours > 0 && (
            <div className="text-xs font-mono text-status-warning mt-0.5">{node.production_loss_hours.toFixed(1)}h downtime</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecoveryOptionsPanel({ options }: { options: RecoveryOption[] }) {
  const optionTypeLabel: Record<string, string> = {
    expedite:               'Air Freight',
    alternate_supplier:     'Alt. Supplier',
    warehouse_reallocation: 'WH Reallocation',
    do_nothing:             'Do Nothing',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700">Recovery Options</h3>
        <span className="text-xs text-stone-500 font-medium">— OR-Tools CP-SAT Optimized</span>
      </div>
      <div className="space-y-3">
        {options.map((opt) => (
          <div key={opt.option_type}
               className={`border-2 rounded-xl p-4 transition-colors ${
                 opt.recommended
                   ? 'border-accent bg-accent/5'
                   : opt.feasible
                   ? 'border-white/50 bg-white/40'
                   : 'border-white/30 bg-white/20 opacity-50'
               }`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {opt.recommended && (
                  <span className="text-[10px] font-bold text-blue-700 border border-accent/40 bg-accent/10 px-2 py-0.5 rounded uppercase tracking-wider">
                    Recommended
                  </span>
                )}
                <span className="text-xs font-semibold text-stone-500 uppercase">
                  {optionTypeLabel[opt.option_type]}
                </span>
              </div>
              <span className={`text-base font-bold font-mono ${opt.option_type === 'do_nothing' ? 'text-status-critical' : 'text-stone-900'}`}>
                ₹{opt.cost.toLocaleString('en-IN')}
              </span>
            </div>
            <h4 className="text-base font-bold text-stone-900">{opt.name}</h4>
            <p className="text-sm text-stone-700 mt-1 mb-3">{opt.description}</p>
            <div className="flex gap-4 text-xs font-medium">
              <span className="text-stone-700">Recovery: <span className="text-stone-900 font-bold">{opt.recovery_quality_pct}%</span></span>
              <span className="text-stone-700">ETA +<span className="text-status-healthy font-bold">{opt.lead_time_improvement_hours.toFixed(0)}h</span></span>
              {opt.expected_savings > 0 && (
                <span className="text-stone-700">Saves: <span className="text-status-healthy font-bold">₹{opt.expected_savings.toLocaleString('en-IN')}</span></span>
              )}
            </div>
            {!opt.feasible && (
              <div className="text-xs text-stone-500 mt-2 italic">Not feasible: insufficient lead time</div>
            )}
          </div>
        ))}
      </div>

      {/* Explanation of recommended */}
      {options.find(o => o.recommended) && (() => {
        const rec = options.find(o => o.recommended)!;
        return (
          <div className="mt-4 border border-white/50 rounded-xl p-4 bg-white/30">
            <div className="text-xs font-mono text-stone-500 uppercase tracking-wider mb-2">Why This Action</div>
            <ul className="space-y-1 text-xs text-stone-700">
              <li className="flex items-start gap-1.5">
                <span className="text-status-healthy mt-0.5">›</span>
                Costs {Math.round((1 - rec.cost / options.find(o => o.option_type === 'do_nothing')!.cost) * 100)}% less than accepting the delay
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-status-healthy mt-0.5">›</span>
                Recovers {rec.recovery_quality_pct}% of disruption impact
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-status-healthy mt-0.5">›</span>
                Improves ETA by {rec.lead_time_improvement_hours.toFixed(0)} hours
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-status-healthy mt-0.5">›</span>
                Saves an estimated ₹{rec.expected_savings.toLocaleString('en-IN')} in exposure
              </li>
            </ul>
          </div>
        );
      })()}
    </div>
  );
}

export default function SimulationPage() {
  const navigate = useNavigate();
  const store = useSimulationStore();
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const { data: scenarios } = useQuery({ queryKey: ['scenarios'], queryFn: getScenarios });

  const simMutation = useMutation({
    mutationFn: runSimulation,
    onSuccess: (data) => { store.setResult(data); store.setRecoveryOptions([]); },
    onSettled: () => store.setRunning(false),
  });

  const optMutation = useMutation({
    mutationFn: (runId: number) => runOptimize(runId),
    onSuccess: (data) => store.setRecoveryOptions(data),
    onSettled: () => store.setOptimizing(false),
  });

  const handleRunSimulation = useCallback(() => {
    if (!store.selectedSupplierId) return;
    store.setRunning(true);
    simMutation.mutate({
      supplier_id: store.selectedSupplierId,
      disruption_type: store.disruptionType,
      delay_hours: store.delayHours,
    });
  }, [store, simMutation]);

  const handleOptimize = useCallback(() => {
    if (!store.result?.simulation_run_id) return;
    store.setOptimizing(true);
    optMutation.mutate(store.result.simulation_run_id);
  }, [store, optMutation]);

  const loadScenario = useCallback((scenario: any) => {
    const cfg = scenario.config_json;
    if (cfg.supplier_id) store.setSelectedSupplier(cfg.supplier_id);
    if (cfg.delay_hours) store.setDelayHours(cfg.delay_hours);
    if (cfg.disruption_type) store.setDisruptionType(cfg.disruption_type);
  }, [store]);

  const s03 = suppliers?.find((s: any) => s.code === 'S03');

  return (
    <div className="flex gap-6 h-full max-w-[1400px]">
      {/* Left: Configuration Panel */}
      <div className="w-80 shrink-0 space-y-5">
        <div className="glass-panel border border-white/40 rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-700 mb-5">Disruption Configuration</h2>

          {/* Supplier Select */}
          <div className="mb-5">
            <label className="block text-xs text-stone-700 mb-2 font-semibold">Source Supplier</label>
            <select
              value={store.selectedSupplierId || ''}
              onChange={e => store.setSelectedSupplier(Number(e.target.value))}
              className="w-full bg-white/40 border border-white/50 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-accent shadow-sm"
            >
              <option value="">Select supplier...</option>
              {(suppliers || []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  [{s.code}] {s.name} — {s.risk_level.toUpperCase()}
                </option>
              ))}
            </select>
            {s03 && !store.selectedSupplierId && (
              <button
                onClick={() => store.setSelectedSupplier(s03.id)}
                className="mt-2 text-xs text-blue-700 font-semibold hover:underline"
              >
                Load flagship demo (S03 — Motherson Sumi)
              </button>
            )}
          </div>

          {/* Disruption Type */}
          <div className="mb-5">
            <label className="block text-xs text-stone-700 mb-2 font-semibold">Disruption Type</label>
            <div className="grid grid-cols-2 gap-2">
              {disruptionTypes.map(dt => (
                <button
                  key={dt.value}
                  onClick={() => store.setDisruptionType(dt.value)}
                  className={`text-xs py-2 px-2 rounded-lg border transition-all text-left ${
                    store.disruptionType === dt.value
                      ? 'border-accent bg-accent text-white shadow-md'
                      : 'border-white/50 bg-white/40 text-stone-700 hover:border-white'
                  }`}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delay Hours Slider */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-stone-700 font-semibold">Delay Duration</label>
              <span className="text-sm font-bold text-stone-900">{store.delayHours}h</span>
            </div>
            <input
              type="range" min={0} max={72} step={1}
              value={store.delayHours}
              onChange={e => store.setDelayHours(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-stone-500 font-bold mt-1">
              <span>0h</span><span>36h</span><span>72h</span>
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunSimulation}
            disabled={!store.selectedSupplierId || store.isRunning}
            className="w-full py-3 bg-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-md transition-all"
          >
            {store.isRunning ? 'Running disruption simulation...' : 'Run Simulation'}
          </button>

          {store.result && (
            <button onClick={store.reset} className="w-full mt-3 py-2 text-xs font-semibold text-stone-700 border border-white/50 bg-white/20 rounded-lg hover:bg-white/40 transition-colors">
              Reset
            </button>
          )}
        </div>

        {/* Scenarios Quick Load */}
        <div className="glass-panel border border-white/40 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-700 mb-4">Scenario Library</h3>
          <div className="space-y-2">
            {(scenarios || []).slice(0, 4).map((sc: any) => (
              <button
                key={sc.id}
                onClick={() => loadScenario(sc)}
                className="w-full text-left text-xs p-3 rounded-lg border border-white/40 bg-white/30 hover:bg-white/60 transition-colors"
              >
                <div className="text-stone-900 font-bold">{sc.name}</div>
                <div className="text-stone-500 mt-1 truncate">{sc.description}</div>
              </button>
            ))}
            <button onClick={() => navigate('/scenarios')} className="text-xs text-blue-700 font-semibold mt-2 inline-block hover:underline">
              View all scenarios
            </button>
          </div>
        </div>
      </div>

      {/* Right: Results Panel */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-5">
        {!store.result && !store.isRunning && (
          <div className="flex flex-col items-center justify-center h-64 glass-panel border border-white/40 rounded-xl shadow-sm">
            <div className="text-stone-900 font-semibold mb-2">No simulation active</div>
            <div className="text-stone-700 text-sm">
              Configure a disruption and click Run Simulation
            </div>
            {s03 && (
              <button
                onClick={() => { store.setSelectedSupplier(s03.id); store.setDelayHours(12); handleRunSimulation(); }}
                className="mt-5 text-xs text-blue-700 font-semibold border border-accent/40 px-4 py-2 rounded-lg hover:bg-white/40 transition-colors"
              >
                Run flagship demo: S03 delay 12h
              </button>
            )}
          </div>
        )}

        {store.isRunning && (
          <div className="flex items-center gap-3 p-6 glass-panel border border-white/40 rounded-xl shadow-sm">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm text-stone-900 font-semibold">Running disruption simulation...</span>
          </div>
        )}

        {store.result && (
          <>
            {/* Summary Banner */}
            <div className="glass-panel border-l-4 border-l-status-critical border border-white/40 rounded-xl p-5 shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">Simulation Complete</div>
                  <h3 className="text-base font-bold text-stone-900">{store.result.summary}</h3>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Total Exposure</div>
                  <div className="text-xl font-mono font-bold text-status-critical mt-1">
                    ₹{store.result.total_financial_exposure.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              <div className="flex gap-6 mt-4 text-sm font-semibold">
                <span className="text-stone-700">Nodes affected: <span className="text-stone-900">{store.result.nodes_affected}</span></span>
                <span className="text-stone-700">Shipments at risk: <span className="text-stone-900">{store.result.shipments_affected}</span></span>
                {store.result.stockout_hours !== null && (
                  <span className="text-stone-700">First stockout in: <span className="text-status-critical">{store.result.stockout_hours?.toFixed(1)}h</span></span>
                )}
                {store.result.production_at_risk && (
                  <span className="text-status-warning bg-status-warning/10 px-2 py-0.5 rounded">Production at risk</span>
                )}
              </div>
            </div>

            {/* Impact Chain */}
            <div className="glass-panel border border-white/40 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700 mb-4">Disruption Propagation Chain</h3>
              <div className="space-y-2">
                {store.result.impact_chain.map((node, i) => (
                  <div key={i}>
                    <ImpactNodeCard node={node} index={i} />
                    {i < store.result!.impact_chain.length - 1 && (
                      <div className="flex justify-start pl-6 py-1">
                        <div className="w-0.5 h-4 bg-white/60" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Optimize Recovery */}
            {!store.recoveryOptions.length && (
              <button
                onClick={handleOptimize}
                disabled={!store.result.simulation_run_id || store.isOptimizing}
                className="w-full py-4 glass-panel border border-accent text-blue-700 hover:bg-white/60 disabled:opacity-40 text-sm font-bold rounded-xl shadow-sm transition-all"
              >
                {store.isOptimizing ? 'Calculating recovery options...' : 'Optimize Recovery'}
              </button>
            )}

            {store.isOptimizing && (
              <div className="flex items-center gap-3 p-5 glass-panel border border-white/40 rounded-xl shadow-sm">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm text-stone-900 font-semibold">Calculating recovery options...</span>
              </div>
            )}

            {/* Recovery Options */}
            {store.recoveryOptions.length > 0 && store.result.simulation_run_id && (
              <div className="glass-panel border border-white/40 rounded-xl p-5 shadow-sm">
                <RecoveryOptionsPanel options={store.recoveryOptions} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
