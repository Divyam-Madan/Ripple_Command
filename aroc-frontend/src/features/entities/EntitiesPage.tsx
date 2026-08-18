import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export default function EntitiesPage() {
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['entities-suppliers'],
    queryFn: () => apiClient.get('/entities/suppliers').then(r => r.data),
  });
  
  const { data: factories, isLoading: factoriesLoading } = useQuery({
    queryKey: ['entities-factories'],
    queryFn: () => apiClient.get('/entities/factories').then(r => r.data),
  });

  return (
    <div className="max-w-[1400px] space-y-6">
      <h2 className="text-xl font-semibold text-text-primary mb-4">Entities Management</h2>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Suppliers Table */}
        <div className="bg-surface-2 border border-border rounded-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Suppliers</h3>
          </div>
          <div className="flex-1 overflow-auto">
            {suppliersLoading ? (
              <div className="p-4 text-xs text-text-secondary font-mono">Loading suppliers...</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-3">
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-text-tertiary font-mono uppercase">Code</th>
                    <th className="text-left p-3 text-text-tertiary font-mono uppercase">Name</th>
                    <th className="text-left p-3 text-text-tertiary font-mono uppercase">Location</th>
                    <th className="text-left p-3 text-text-tertiary font-mono uppercase">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {(suppliers || []).map((s: any) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-surface-3 transition-colors">
                      <td className="p-3 font-mono text-text-secondary">{s.code}</td>
                      <td className="p-3 text-text-primary font-medium">{s.name}</td>
                      <td className="p-3 text-text-secondary">{s.location_name}</td>
                      <td className="p-3 font-mono">
                        <span className={
                          s.risk_level === 'critical' || s.risk_level === 'high' ? 'text-status-critical' :
                          s.risk_level === 'medium' ? 'text-status-warning' : 'text-status-healthy'
                        }>{s.risk_level?.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Factories Table */}
        <div className="bg-surface-2 border border-border rounded-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Factories</h3>
          </div>
          <div className="flex-1 overflow-auto">
            {factoriesLoading ? (
              <div className="p-4 text-xs text-text-secondary font-mono">Loading factories...</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-3">
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-text-tertiary font-mono uppercase">Code</th>
                    <th className="text-left p-3 text-text-tertiary font-mono uppercase">Name</th>
                    <th className="text-left p-3 text-text-tertiary font-mono uppercase">Location</th>
                    <th className="text-left p-3 text-text-tertiary font-mono uppercase">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {(factories || []).map((f: any) => (
                    <tr key={f.id} className="border-b border-border/50 hover:bg-surface-3 transition-colors">
                      <td className="p-3 font-mono text-text-secondary">{f.code}</td>
                      <td className="p-3 text-text-primary font-medium">{f.name}</td>
                      <td className="p-3 text-text-secondary">{f.location_name}</td>
                      <td className="p-3 font-mono text-text-secondary">{f.capacity?.toLocaleString()} /mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
