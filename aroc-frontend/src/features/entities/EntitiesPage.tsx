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
      <div className="glass-panel border border-white/50 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-black text-stone-950">Enterprise Entities Registry</h2>
        <p className="text-sm font-bold text-stone-700 mt-1">
          Master registry of verified Tier-1 suppliers, assembly plants, and distribution centers across the digital twin.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Suppliers Table */}
        <div className="glass-panel bg-white/80 border border-white/60 rounded-2xl flex flex-col h-[600px] shadow-xl overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-white/60">
            <h3 className="text-sm font-black text-stone-950 uppercase tracking-wider">Tier-1 Suppliers</h3>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {suppliersLoading ? (
              <div className="p-6 text-xs text-stone-800 font-mono font-bold">Loading suppliers...</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-stone-300 shadow-sm z-10">
                  <tr>
                    <th className="text-left p-3.5 text-stone-950 font-black font-mono uppercase">Code</th>
                    <th className="text-left p-3.5 text-stone-950 font-black font-mono uppercase">Name</th>
                    <th className="text-left p-3.5 text-stone-950 font-black font-mono uppercase">Location</th>
                    <th className="text-left p-3.5 text-stone-950 font-black font-mono uppercase">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {(suppliers || []).map((s: any) => (
                    <tr key={s.id} className="hover:bg-white/90 bg-white/30 transition-colors">
                      <td className="p-3.5 font-mono text-stone-950 font-black">{s.code}</td>
                      <td className="p-3.5 text-stone-900 font-bold">{s.name}</td>
                      <td className="p-3.5 text-stone-800 font-medium">{s.location_name}</td>
                      <td className="p-3.5 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          s.risk_level === 'critical' || s.risk_level === 'high' ? 'bg-red-500/15 text-red-800 border border-red-500/30' :
                          s.risk_level === 'medium' ? 'bg-amber-500/15 text-amber-800 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                        }`}>{s.risk_level?.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Factories Table */}
        <div className="glass-panel bg-white/80 border border-white/60 rounded-2xl flex flex-col h-[600px] shadow-xl overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-white/60">
            <h3 className="text-sm font-black text-stone-950 uppercase tracking-wider">Assembly Plants & Factories</h3>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {factoriesLoading ? (
              <div className="p-6 text-xs text-stone-800 font-mono font-bold">Loading factories...</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-stone-300 shadow-sm z-10">
                  <tr>
                    <th className="text-left p-3.5 text-stone-950 font-black font-mono uppercase">Code</th>
                    <th className="text-left p-3.5 text-stone-950 font-black font-mono uppercase">Name</th>
                    <th className="text-left p-3.5 text-stone-950 font-black font-mono uppercase">Location</th>
                    <th className="text-left p-3.5 text-stone-950 font-black font-mono uppercase">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {(factories || []).map((f: any) => (
                    <tr key={f.id} className="hover:bg-white/90 bg-white/30 transition-colors">
                      <td className="p-3.5 font-mono text-stone-950 font-black">{f.code}</td>
                      <td className="p-3.5 text-stone-900 font-bold">{f.name}</td>
                      <td className="p-3.5 text-stone-800 font-medium">{f.location_name}</td>
                      <td className="p-3.5 font-mono text-stone-950 font-black">
                        {f.production_rate_per_hour ? `${f.production_rate_per_hour} units/h` : `${f.capacity?.toLocaleString()} units`}
                      </td>
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
