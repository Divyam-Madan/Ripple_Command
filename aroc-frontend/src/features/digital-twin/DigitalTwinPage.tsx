import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, NodeProps, Handle, Position, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { apiClient } from '@/lib/api/client';
import { useSimulationStore } from '@/stores/simulationStore';
import MapGL, { Marker, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = import.meta.env.VITE_MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json';

// ── Custom Node Types ─────────────────────────────────────────────────────────

type SupplyChainNodeData = {
  id: number;
  label: string;
  code: string;
  risk_level?: string;
  status?: string;
  utilization?: number;
  inventory_pct?: number;
  lat?: number;
  lng?: number;
  impact_severity?: string;  // injected by simulation
};
type SCNode = Node<SupplyChainNodeData>;

const nodeColors: Record<string, string> = {
  supplier:      '#3b82f6',
  factory:       '#a78bfa',
  warehouse:     '#34d399',
  dealer:        '#fb923c',
  transport_hub: '#e2e8f0',
};
const statusDot: Record<string, string> = {
  low:      '#4ade80',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#ef4444',
  healthy:  '#4ade80',
  warning:  '#f59e0b',
  active:   '#4ade80',
};
const impactSeverityBg: Record<string, string> = {
  critical: '#7f1d1d',
  high:     '#78350f',
  medium:   '#1e3a5f',
};

function SupplyChainNode({ data, type }: NodeProps<SCNode>) {
  const color = nodeColors[type || 'supplier'] || '#64748b';
  const dot = data.impact_severity
    ? statusDot[data.impact_severity] || '#64748b'
    : statusDot[data.risk_level || data.status || 'active'] || '#64748b';
  const bg = data.impact_severity ? (impactSeverityBg[data.impact_severity] || '#1a1e28') : '#1a1e28';

  return (
    <div
      className="relative rounded-sm text-xs font-mono"
      style={{
        background: bg,
        border: `1px solid ${color}40`,
        borderTop: `2px solid ${color}`,
        minWidth: 120, padding: '6px 10px',
        boxShadow: data.impact_severity ? `0 0 16px ${dot}40` : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 6, height: 6 }} />
      <div style={{ color: `${color}aa` }} className="uppercase text-[9px] tracking-widest">{type}</div>
      <div className="text-white font-medium text-[11px] leading-tight mt-0.5 truncate max-w-[110px]">{data.label}</div>
      <div className="flex items-center gap-1 mt-1">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
        <span style={{ color: `${color}99` }}>{data.code}</span>
      </div>
      {data.impact_severity && (
        <div className="text-[9px] uppercase tracking-wider mt-1" style={{ color: dot }}>
          {data.impact_severity}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes = {
  supplier:      SupplyChainNode,
  factory:       SupplyChainNode,
  warehouse:     SupplyChainNode,
  dealer:        SupplyChainNode,
  transport_hub: SupplyChainNode,
};

// ── Main Component ─────────────────────────────────────────────────────────────

type ViewMode = 'topology' | 'geographic';

export default function DigitalTwinPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('topology');
  const [selectedNode, setSelectedNode] = useState<{ type: string; id: number; name: string } | null>(null);
  const [mapPopup, setMapPopup] = useState<any | null>(null);

  const simResult = useSimulationStore(s => s.result);

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['entity-graph'],
    queryFn: () => apiClient.get('/entities/graph').then(r => r.data),
    staleTime: 60_000,
  });

  // Inject simulation impact severity into nodes
  const impactMap = new Map(
    (simResult?.impact_chain || []).map(n => [`${n.node_type}_${n.node_id}`, n.severity])
  );

  const rawNodes = (graphData?.nodes || []).map((n: any) => ({
    ...n,
    type: n.type,
    data: {
      ...n.data,
      impact_severity: impactMap.get(n.id) || undefined,
    },
  }));

  const [nodes, , onNodesChange] = useNodesState(rawNodes);
  const [edges, , onEdgesChange] = useEdgesState(
    (graphData?.edges || []).map((e: any) => ({
      ...e,
      style: { stroke: 'rgba(139,144,160,0.2)', strokeWidth: 1 },
      animated: e.data?.delay_prob > 0.3,
    }))
  );

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode({ type: node.type, id: node.data.id, name: node.data.label });
  }, []);

  if (isLoading) {
    return <div className="flex items-center gap-3 p-8 text-stone-700 text-sm font-mono">
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      Loading network topology...
    </div>;
  }

  // Collect all geographic entities
  const geoEntities = [
    ...(graphData?.nodes || []).filter((n: any) => n.data?.lat && n.data?.lng)
  ];

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]">
      {/* Main viz area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 mb-4">
          {(['topology', 'geographic'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`text-xs font-mono uppercase tracking-wider px-4 py-2 rounded-sm transition-colors ${
                viewMode === v
                  ? 'bg-surface-2 text-stone-900 border border-border'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {v === 'topology' ? 'Dependency Topology' : 'Geographic View'}
            </button>
          ))}
          {simResult && (
            <div className="ml-4 flex items-center gap-2 text-xs font-mono text-status-warning">
              <div className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />
              Simulation overlay active — {simResult.supplier_name} +{simResult.delay_hours}h
            </div>
          )}
        </div>

        {/* Topology View */}
        {viewMode === 'topology' && (
          <div className="flex-1 bg-surface-1 border border-border rounded-sm overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.3}
              maxZoom={2}
            >
              <Background color="#21263a" gap={24} size={1} />
              <Controls className="!bg-surface-2 !border-border" />
              <MiniMap
                style={{ background: '#13161e', border: '1px solid rgba(139,144,160,0.12)' }}
                nodeColor={(n) => nodeColors[n.type || ''] || '#64748b'}
                maskColor="rgba(13,15,20,0.6)"
              />
            </ReactFlow>
          </div>
        )}

        {/* Geographic View */}
        {viewMode === 'geographic' && (
          <div className="flex-1 rounded-sm overflow-hidden border border-border">
            <MapGL
              initialViewState={{ longitude: 79, latitude: 22, zoom: 4.2 }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={MAP_STYLE}
            >
              {geoEntities.map((entity: any) => {
                const color = nodeColors[entity.type] || '#64748b';
                const impactSev = impactMap.get(entity.id);
                const dotColor = impactSev ? (statusDot[impactSev] || color) : color;
                return (
                  <Marker
                    key={entity.id}
                    longitude={entity.data.lng}
                    latitude={entity.data.lat}
                    onClick={e => { e.originalEvent.stopPropagation(); setMapPopup(entity); }}
                  >
                    <div
                      className="cursor-pointer transition-transform hover:scale-125"
                      style={{
                        width: entity.type === 'factory' ? 14 : 10,
                        height: entity.type === 'factory' ? 14 : 10,
                        borderRadius: entity.type === 'warehouse' ? 2 : '50%',
                        background: dotColor,
                        border: `2px solid ${dotColor}80`,
                        boxShadow: impactSev ? `0 0 8px ${dotColor}` : 'none',
                      }}
                    />
                  </Marker>
                );
              })}
              {mapPopup && (
                <Popup
                  longitude={mapPopup.data.lng}
                  latitude={mapPopup.data.lat}
                  onClose={() => setMapPopup(null)}
                  closeButton={true}
                  className="!bg-white/80 !backdrop-blur-md !text-stone-900 !border-white/50 !font-mono !text-xs !rounded-xl !shadow-lg"
                >
                  <div style={{ padding: '6px 4px' }}>
                    <div style={{ color: '#78716c', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                      {mapPopup.type}
                    </div>
                    <div style={{ color: '#1c1917', fontWeight: 700, marginTop: 4, fontSize: 13 }}>{mapPopup.data.label}</div>
                    <div style={{ color: '#44403c', marginTop: 2 }}>{mapPopup.data.code}</div>
                    {mapPopup.data.risk_level && (
                      <div style={{ marginTop: 6, color: mapPopup.data.risk_level === 'high' ? '#dc2626' : mapPopup.data.risk_level === 'medium' ? '#d97706' : '#059669', fontWeight: 600 }}>
                        Risk: {mapPopup.data.risk_level.toUpperCase()}
                      </div>
                    )}
                    {impactMap.get(mapPopup.id) && (
                      <div style={{ marginTop: 4, color: statusDot[impactMap.get(mapPopup.id)!] || '#ef4444', fontSize: 9, fontWeight: 700 }}>
                        SIMULATION: {impactMap.get(mapPopup.id)?.toUpperCase()} IMPACT
                      </div>
                    )}
                  </div>
                </Popup>
              )}
            </MapGL>
          </div>
        )}
      </div>

      {/* Right: Node detail panel */}
      {selectedNode ? (
        <NodeDetailPanel nodeType={selectedNode.type} nodeId={selectedNode.id} name={selectedNode.name}
          onClose={() => setSelectedNode(null)} impactSev={impactMap.get(`${selectedNode.type}_${selectedNode.id}`)} />
      ) : (
        <div className="w-80 shrink-0 glass-panel border border-white/40 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-stone-700 text-xs font-semibold uppercase tracking-wider mb-2">Node Detail</div>
          <p className="text-sm text-stone-900">Click any node in the topology to inspect its properties and realtime metrics.</p>
          {/* Legend */}
          <div className="mt-8 w-full space-y-3">
            <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-4 border-b border-white/20 pb-2 text-left">Legend</div>
            {Object.entries(nodeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-3 text-sm text-stone-900 font-medium">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: color }} />
                <span className="capitalize">{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NodeDetailPanel({ nodeType, nodeId, name, onClose, impactSev }: {
  nodeType: string; nodeId: number; name: string; onClose: () => void;
  impactSev?: string;
}) {
  const endpoint = nodeType === 'supplier' ? 'suppliers' :
                   nodeType === 'factory'  ? 'factories' :
                   nodeType === 'warehouse' ? 'warehouses' : null;

  const { data, isLoading } = useQuery({
    queryKey: ['node-detail', nodeType, nodeId],
    queryFn: () => endpoint ? apiClient.get(`/entities/${endpoint}/${nodeId}`).then(r => r.data) : Promise.resolve(null),
    enabled: !!endpoint,
  });

  return (
    <div className="w-80 shrink-0 glass-panel border border-white/40 rounded-xl p-5 overflow-y-auto shadow-sm">
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider">{nodeType}</div>
          <h3 className="text-base font-bold text-stone-900 mt-1">{name}</h3>
        </div>
        <button onClick={onClose} className="text-stone-500 hover:text-stone-900 text-2xl leading-none">&times;</button>
      </div>

      {impactSev && (
        <div className={`mb-4 text-xs font-bold px-3 py-2 rounded-lg border ${
          impactSev === 'critical' ? 'text-status-critical border-red-500/20 bg-red-500/10' :
          impactSev === 'high' ? 'text-status-warning border-amber-500/20 bg-amber-500/10' :
          'text-blue-700 border-blue-500/20 bg-blue-500/10'
        }`}>
          Simulation impact: {impactSev.toUpperCase()}
        </div>
      )}

      {isLoading && <div className="text-sm text-stone-700 font-medium">Loading node data...</div>}

      {data && (
        <div className="space-y-3.5 text-sm">
          <Field label="Location" value={data.location_name} />
          {data.code && <Field label="Code" value={data.code} mono />}
          {data.capacity && <Field label="Capacity" value={data.capacity?.toLocaleString()} />}
          {data.current_inventory !== undefined && <Field label="Current Inventory" value={data.current_inventory?.toLocaleString()} />}
          {data.safety_stock_threshold && <Field label="Safety Stock" value={data.safety_stock_threshold?.toLocaleString()} />}
          {data.reliability_score && <Field label="Reliability" value={`${(data.reliability_score * 100).toFixed(0)}%`} />}
          {data.risk_level && <Field label="Risk Level" value={data.risk_level.toUpperCase()} />}
          {data.current_utilization !== undefined && <Field label="Utilization" value={`${(data.current_utilization * 100).toFixed(0)}%`} />}
          {data.lead_time_days && <Field label="Lead Time" value={`${data.lead_time_days} days`} />}
          {data.cost_per_unit && <Field label="Cost/Unit" value={`₹${data.cost_per_unit?.toLocaleString('en-IN')}`} />}
          {data.production_rate_per_hour && <Field label="Production Rate" value={`${data.production_rate_per_hour} units/h`} />}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-stone-500">{label}</span>
      <span className={`text-stone-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
