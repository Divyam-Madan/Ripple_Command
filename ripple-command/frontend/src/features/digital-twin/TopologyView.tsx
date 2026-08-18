import { useMemo } from "react";
import {
  ReactFlow, Background, Controls, type Node, type Edge, type NodeProps, Handle, Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { GraphNode, GraphResponse } from "@/types";

const COLUMN_ORDER = ["supplier", "factory", "transport_hub", "warehouse", "dealer"];
const COLUMN_LABELS: Record<string, string> = {
  supplier: "Suppliers", factory: "Factories", transport_hub: "Transport Hubs",
  warehouse: "Warehouses", dealer: "Dealers",
};
const COLUMN_X = 260;
const ROW_Y = 78;

const STATUS_COLOR: Record<string, string> = {
  healthy: "#4C7A5E", warning: "#B8863A", critical: "#AE3E32", inactive: "#8B8F86",
};

function TwinNode({ data }: NodeProps) {
  const node = data as unknown as GraphNode;
  return (
    <div
      className="w-[210px] border bg-white px-3 py-2 text-left shadow-none"
      style={{ borderColor: "rgba(92,96,88,0.3)" }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#8B8F86", width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: "#8B8F86", width: 6, height: 6 }} />
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: STATUS_COLOR[node.status] ?? STATUS_COLOR.inactive }}
        />
        <span className="truncate text-[12px] font-medium text-graphite-900">{node.name}</span>
      </div>
      {node.city && <div className="mt-0.5 text-[10px] text-graphite-500">{node.city as string}</div>}
    </div>
  );
}

const nodeTypes = { twin: TwinNode };

export function TopologyView({ graph, onSelect }: { graph: GraphResponse; onSelect: (n: GraphNode) => void }) {
  const { nodes, edges } = useMemo(() => {
    const columnCounters: Record<string, number> = {};
    const rfNodes: Node[] = graph.nodes
      .filter((n) => COLUMN_ORDER.includes(n.node_type))
      .map((n) => {
        const col = COLUMN_ORDER.indexOf(n.node_type);
        const row = columnCounters[n.node_type] ?? 0;
        columnCounters[n.node_type] = row + 1;
        return {
          id: n.id,
          type: "twin",
          position: { x: col * COLUMN_X, y: row * ROW_Y },
          data: n as unknown as Record<string, unknown>,
        };
      });

    const rfEdges: Edge[] = graph.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      style: {
        stroke: e.delay_probability > 0.15 ? "#B8863A" : "rgba(92,96,88,0.35)",
        strokeWidth: e.delay_probability > 0.15 ? 1.5 : 1,
      },
      animated: false,
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph]);

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-6">
        {COLUMN_ORDER.map((c) => (
          <div key={c} className="w-[210px] text-[10px] font-medium uppercase tracking-wide text-graphite-500">
            {COLUMN_LABELS[c]}
          </div>
        ))}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.data as unknown as GraphNode)}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
      >
        <Background color="#DAD4C6" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
