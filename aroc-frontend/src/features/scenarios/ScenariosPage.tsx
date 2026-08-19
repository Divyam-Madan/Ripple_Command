import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';
import { useSimulationStore } from '@/stores/simulationStore';

const scenarioTypeColors: Record<string, { badge: string; label: string }> = {
  baseline:           { badge: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30', label: 'Baseline' },
  supplier_delay:     { badge: 'bg-amber-500/15 text-amber-800 border-amber-500/30', label: 'Supplier Delay' },
  route_closure:      { badge: 'bg-red-500/15 text-red-800 border-red-500/30', label: 'Route Closure' },
  truck_breakdown:    { badge: 'bg-amber-500/15 text-amber-800 border-amber-500/30', label: 'Fleet Breakdown' },
  warehouse_stockout: { badge: 'bg-red-500/15 text-red-800 border-red-500/30', label: 'Warehouse Stockout' },
  demand_surge:       { badge: 'bg-blue-500/15 text-blue-800 border-blue-500/30', label: 'Demand Surge' },
  port_congestion:    { badge: 'bg-purple-500/15 text-purple-800 border-purple-500/30', label: 'Port Congestion' },
};

export default function ScenariosPage() {
  const navigate = useNavigate();
  const store = useSimulationStore();

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => apiClient.get('/scenarios').then(r => r.data),
  });

  const loadMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/scenarios/${id}/load`).then(r => r.data),
    onSuccess: (data) => {
      const cfg = data.config;
      if (cfg.supplier_id) store.setSelectedSupplier(cfg.supplier_id);
      if (cfg.delay_hours != null) store.setDelayHours(cfg.delay_hours);
      if (cfg.disruption_type) store.setDisruptionType(cfg.disruption_type);
      store.setResult(null);
      store.setRecoveryOptions([]);
      navigate('/simulation');
    },
  });

  if (isLoading) return (
    <div className="flex items-center gap-3 p-8 text-stone-900 text-sm font-mono font-bold">
      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
      Loading scenario library...
    </div>
  );

  return (
    <div className="max-w-[1200px] space-y-6">
      <div className="glass-panel border border-white/50 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-black text-stone-950">Scenario Simulation Library</h2>
        <p className="text-sm font-bold text-stone-700 mt-1">
          Pre-configured real-world disruption scenarios. Loading a scenario pre-fills the digital twin simulator for instant cascade analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {(scenarios || []).map((sc: any) => {
          const typeBadge = scenarioTypeColors[sc.scenario_type] || { badge: 'bg-stone-500/15 text-stone-800 border-stone-300', label: sc.scenario_type };

          return (
            <div
              key={sc.id}
              className="glass-panel bg-white/75 hover:bg-white/95 border border-white/60 rounded-2xl p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 shadow-lg group"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-black text-stone-950 leading-tight group-hover:text-blue-700 transition-colors">
                    {sc.name}
                  </h3>
                  <span className={`text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded-md border shrink-0 ${typeBadge.badge}`}>
                    {typeBadge.label}
                  </span>
                </div>
                
                <p className="text-xs font-semibold text-stone-700 leading-relaxed mt-2">
                  {sc.description}
                </p>

                {/* Config preview */}
                {sc.config_json && (
                  <div className="mt-4 p-3 rounded-xl bg-white/70 border border-stone-200/80 text-xs font-mono space-y-1.5 shadow-inner">
                    {sc.config_json.delay_hours > 0 && (
                      <div className="flex items-center justify-between text-stone-700 font-bold">
                        <span>Projected Delay:</span>
                        <span className="text-red-700 font-black">{sc.config_json.delay_hours} hours</span>
                      </div>
                    )}
                    {sc.config_json.supplier_id && (
                      <div className="flex items-center justify-between text-stone-700 font-bold">
                        <span>Disruption Target:</span>
                        <span className="text-stone-950 font-black">Supplier ID #{sc.config_json.supplier_id}</span>
                      </div>
                    )}
                    {sc.config_json.demand_multiplier && (
                      <div className="flex items-center justify-between text-stone-700 font-bold">
                        <span>Demand Multiplier:</span>
                        <span className="text-blue-700 font-black">&times;{sc.config_json.demand_multiplier} Surge</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => loadMutation.mutate(sc.id)}
                disabled={loadMutation.isPending}
                className="mt-5 w-full py-2.5 text-xs font-black rounded-xl bg-stone-900 text-white hover:bg-black hover:scale-[1.02] shadow-md transition-all flex items-center justify-center gap-1.5 border border-white/20"
              >
                {loadMutation.isPending ? 'Loading Scenario...' : 'Load Scenario into Simulator →'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
