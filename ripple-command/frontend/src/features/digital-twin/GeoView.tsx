import { useMemo } from "react";

import type { GraphNode, GraphResponse } from "@/types";

const LAT_RANGE: [number, number] = [7, 30];
const LON_RANGE: [number, number] = [68, 90];
const VIEW_W = 900;
const VIEW_H = 640;

const STATUS_COLOR: Record<string, string> = {
  healthy: "#4C7A5E", warning: "#B8863A", critical: "#AE3E32", inactive: "#8B8F86",
};
const TYPE_RADIUS: Record<string, number> = {
  supplier: 4, factory: 6, warehouse: 5, transport_hub: 4, dealer: 3,
};

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_RANGE[0]) / (LON_RANGE[1] - LON_RANGE[0])) * VIEW_W;
  const y = VIEW_H - ((lat - LAT_RANGE[0]) / (LAT_RANGE[1] - LAT_RANGE[0])) * VIEW_H;
  return [x, y];
}

export function GeoView({ graph, onSelect }: { graph: GraphResponse; onSelect: (n: GraphNode) => void }) {
  const points = useMemo(
    () => graph.nodes.filter((n) => n.lat != null && n.lon != null),
    [graph],
  );

  return (
    <div className="h-full w-full overflow-auto bg-stone-100">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block h-full max-w-full">
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#EFEBE2" />
        {points.map((n) => {
          const [x, y] = project(n.lat as number, n.lon as number);
          return (
            <g
              key={n.id}
              transform={`translate(${x},${y})`}
              onClick={() => onSelect(n)}
              className="cursor-pointer"
            >
              <circle
                r={TYPE_RADIUS[n.node_type] ?? 3}
                fill={STATUS_COLOR[n.status] ?? STATUS_COLOR.inactive}
                stroke="#F7F5F0"
                strokeWidth={1}
              />
              <title>{`${n.name} \u2014 ${n.city}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="px-4 pb-4 text-[11px] text-graphite-500">
        Lightweight geographic projection of seeded network coordinates. Swap in MapLibre GL + a MAPTILER_API_KEY
        for tiled basemaps in a production deployment.
      </div>
    </div>
  );
}
