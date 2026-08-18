import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';
import { useSimulationStore } from '@/stores/simulationStore';

const scenarioTypeColors: Record<string, string> = {
  baseline:           'text-status-healthy',
  supplier_delay:     'text-status-warning',
  route_closure:      'text-status-critical',
  truck_breakdown:    'text-status-warning',
  warehouse_stockout: 'text-status-warning',
  demand_surge:       'text-accent',
  port_congestion:    'text-status-warning',
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
    <div className="flex items-center gap-3 p-8 text-text-secondary text-sm font-mono">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      Loading scenario library...
    </div>
  );

  return (
    <div className="max-w-[1200px]">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-text-primary">Scenario Library</h2>
        <p className="text-sm text-text-secondary mt-1">
          Pre-configured disruption scenarios. Loading a scenario pre-fills the simulator configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(scenarios || []).map((sc: any) => (
          <div key={sc.id}
            className="bg-surface-2 border border-border rounded-sm p-4 flex flex-col justify-between hover:border-border/70 transition-colors">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-text-primary leading-tight">{sc.name}</h3>
                <span className={`text-xs font-mono shrink-0 ${scenarioTypeColors[sc.scenario_type] || 'text-text-secondary'}`}>
                  {sc.scenario_type.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{sc.description}</p>

              {/* Config preview */}
              {sc.config_json && (
                <div className="mt-3 text-xs font-mono space-y-1">
                  {sc.config_json.delay_hours > 0 && (
                    <div className="text-text-tertiary">
                      Delay: <span className="text-status-warning">{sc.config_json.delay_hours}h</span>
                    </div>
                  )}
                  {sc.config_json.supplier_id && (
                    <div className="text-text-tertiary">
                      Supplier: <span className="text-text-secondary">ID {sc.config_json.supplier_id}</span>
                    </div>
                  )}
                  {sc.config_json.demand_multiplier && (
                    <div className="text-text-tertiary">
                      Demand surge: <span className="text-accent">×{sc.config_json.demand_multiplier}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => loadMutation.mutate(sc.id)}
              disabled={loadMutation.isPending}
              className="mt-4 w-full py-2 text-xs font-mono border border-border hover:border-accent hover:text-accent text-text-secondary rounded-sm transition-colors"
            >
              {loadMutation.isPending ? 'Loading...' : 'Load Scenario →'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
