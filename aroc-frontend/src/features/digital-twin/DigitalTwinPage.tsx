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
    return <div className="flex items-center gap-3 p-8 text-text-secondary text-sm font-mono">
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
                  ? 'bg-surface-2 text-text-primary border border-border'
                  : 'text-text-tertiary hover:text-text-secondary'
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
                  className="!bg-surface-2 !text-text-primary !border-border !font-mono !text-xs"
                >
                  <div style={{ padding: '4px 2px' }}>
                    <div style={{ color: '#8b90a0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {mapPopup.type}
                    </div>
                    <div style={{ color: '#e8eaf0', fontWeight: 600, marginTop: 2 }}>{mapPopup.data.label}</div>
                    <div style={{ color: '#8b90a0', marginTop: 2 }}>{mapPopup.data.code}</div>
                    {mapPopup.data.risk_level && (
                      <div style={{ marginTop: 4, color: statusDot[mapPopup.data.risk_level] || '#64748b', fontSize: 9 }}>
                        RISK: {mapPopup.data.risk_level?.toUpperCase()}
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
        <div className="w-72 shrink-0 bg-surface-2 border border-border rounded-sm p-4 flex flex-col items-center justify-center text-center">
          <div className="text-text-tertiary text-xs font-mono mb-2">Node Detail</div>
          <p className="text-xs text-text-secondary">Click any node in the topology to inspect it.</p>
          {/* Legend */}
          <div className="mt-6 w-full space-y-2">
            <div className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Legend</div>
            {Object.entries(nodeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 text-xs text-text-secondary">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
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
    <div className="w-72 shrink-0 bg-surface-2 border border-border rounded-sm p-4 overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-xs font-mono text-text-tertiary uppercase tracking-wider">{nodeType}</div>
          <h3 className="text-sm font-semibold text-text-primary mt-0.5">{name}</h3>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary text-lg leading-none">&times;</button>
      </div>

      {impactSev && (
        <div className={`mb-3 text-xs font-mono px-2 py-1.5 rounded-sm border ${
          impactSev === 'critical' ? 'text-status-critical border-red-900/40 bg-red-950/20' :
          impactSev === 'high' ? 'text-status-warning border-amber-900/40 bg-amber-950/20' :
          'text-accent border-blue-900/40 bg-blue-950/20'
        }`}>
          Simulation impact: {impactSev.toUpperCase()}
        </div>
      )}

      {isLoading && <div className="text-xs text-text-secondary font-mono">Loading node data...</div>}

      {data && (
        <div className="space-y-3 text-xs">
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
      <span className="text-text-tertiary">{label}</span>
      <span className={`text-text-primary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
