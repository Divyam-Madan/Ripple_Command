import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Cell, PieChart, Pie, Legend
} from 'recharts';
import { apiClient } from '@/lib/api/client';

const chartTheme = {
  grid: 'rgba(139,144,160,0.08)',
  tick: { fill: '#555b6e', fontSize: 10, fontFamily: 'IBM Plex Mono' },
  tooltip: { background: '#1a1e28', border: '1px solid rgba(139,144,160,0.12)', borderRadius: 4,
             color: '#e8eaf0', fontSize: 11, fontFamily: 'IBM Plex Mono' },
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-2 border border-border rounded-sm p-4">
      <div className="text-xs font-mono uppercase tracking-widest text-text-tertiary mb-4">{title}</div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: reliability } = useQuery({
    queryKey: ['analytics-reliability'],
    queryFn: () => apiClient.get('/analytics/supplier-reliability').then(r => r.data),
  });
  const { data: disruptions } = useQuery({
    queryKey: ['analytics-disruptions'],
    queryFn: () => apiClient.get('/analytics/disruption-frequency').then(r => r.data),
  });
  const { data: financial } = useQuery({
    queryKey: ['analytics-financial'],
    queryFn: () => apiClient.get('/analytics/financial-trend').then(r => r.data),
  });
  const { data: inventory } = useQuery({
    queryKey: ['analytics-inventory'],
    queryFn: () => apiClient.get('/analytics/inventory-health').then(r => r.data),
  });
  const { data: shipmentSummary } = useQuery({
    queryKey: ['analytics-shipment-summary'],
    queryFn: () => apiClient.get('/analytics/shipment-status-summary').then(r => r.data),
  });

  const statusColors: Record<string, string> = {
    in_transit: '#3b82f6',
    delivered: '#4ade80',
    delayed: '#ef4444',
    at_risk: '#f59e0b',
    pending: '#555b6e',
    cancelled: '#374151',
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="grid grid-cols-2 gap-5">
        {/* Supplier Reliability */}
        <ChartCard title="Supplier Reliability Score">
          {reliability ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={reliability} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="name" tick={chartTheme.tick} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={chartTheme.tick} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={chartTheme.tooltip}
                  formatter={(v: number, _: string, p: any) => [`${v}%`, p.payload.full_name]}
                />
                <Bar dataKey="reliability" radius={[2, 2, 0, 0]}>
                  {(reliability || []).map((entry: any) => (
                    <Cell key={entry.name}
                      fill={entry.risk_level === 'high' || entry.risk_level === 'critical' ? '#ef4444' :
                            entry.risk_level === 'medium' ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Skeleton />}
        </ChartCard>

        {/* Shipment Status Distribution */}
        <ChartCard title="Shipment Status Distribution">
          {shipmentSummary ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={shipmentSummary} dataKey="count" nameKey="status"
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  label={({ name, percent }) => `${name.replace('_', ' ')}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#555b6e' }}
                >
                  {(shipmentSummary || []).map((entry: any) => (
                    <Cell key={entry.status} fill={statusColors[entry.status] || '#64748b'} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8b90a0' }} />
                <Tooltip contentStyle={chartTheme.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Skeleton />}
        </ChartCard>

        {/* Financial Trend */}
        <ChartCard title="Financial Exposure Trend (6 Months)">
          {financial ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={financial} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="month" tick={chartTheme.tick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTheme.tick} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v / 1_00_000).toFixed(1)}L`} />
                <Tooltip contentStyle={chartTheme.tooltip}
                  formatter={(v: number, name: string) => [`₹${v.toLocaleString('en-IN')}`, name === 'exposure' ? 'Gross Exposure' : 'Recovered']}
                />
                <Line type="monotone" dataKey="exposure" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
                <Line type="monotone" dataKey="recovered" stroke="#4ade80" strokeWidth={2} dot={{ r: 3, fill: '#4ade80' }} strokeDasharray="4 2" />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8b90a0' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Skeleton />}
        </ChartCard>

        {/* Inventory Health */}
        <ChartCard title="Inventory Health vs Safety Stock">
          {inventory ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={inventory.slice(0, 12)} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                <XAxis type="number" tick={chartTheme.tick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="node_type" tick={chartTheme.tick} axisLine={false} tickLine={false}
                  tickFormatter={(_, i) => `${inventory[i]?.node_type?.[0].toUpperCase()}-${inventory[i]?.node_id}`} />
                <Tooltip contentStyle={chartTheme.tooltip}
                  formatter={(v: number, name: string) => [v.toLocaleString(), name === 'quantity' ? 'Current Stock' : 'Safety Stock']}
                />
                <Bar dataKey="quantity" radius={[0, 2, 2, 0]}>
                  {(inventory || []).slice(0, 12).map((entry: any) => (
                    <Cell key={entry.id} fill={entry.below_safety_stock ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
                <Bar dataKey="safety_stock" fill="rgba(139,144,160,0.2)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Skeleton />}
        </ChartCard>
      </div>

      {/* Disruption Frequency */}
      <ChartCard title="Disruption Frequency by Type">
        {disruptions && disruptions.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={disruptions} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="type" tick={chartTheme.tick} axisLine={false} tickLine={false}
                tickFormatter={v => v.replace(/_/g, ' ')} />
              <YAxis tick={chartTheme.tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTheme.tooltip} formatter={(v: number) => [v, 'Incidents']} />
              <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex items-center justify-center text-text-tertiary text-xs font-mono">
            No disruption history recorded yet.
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="h-60 flex items-center justify-center text-text-tertiary text-xs font-mono">
      Loading chart data...
    </div>
  );
}
