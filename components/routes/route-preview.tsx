"use client";

import type { Coordinates, Route, RouteGeometry } from "@/lib/types";
import { cn } from "@/lib/utils";

function projector(geometry: RouteGeometry) {
  const { minLat, maxLat, minLng, maxLng } = geometry.bounds;
  const lngScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const maxX = Math.max((maxLng - minLng) * lngScale, 0.001);
  const maxY = Math.max(maxLat - minLat, 0.001);
  const range = Math.max(maxX, maxY);
  const offsetX = (range - maxX) / 2;
  const offsetY = (range - maxY) / 2;
  return (point: Coordinates) => ({
    x: 8 + (((point.lng - minLng) * lngScale + offsetX) / range) * 84,
    y: 10 + (((maxLat - point.lat) + offsetY) / range) * 80,
  });
}

export function RoutePreview({
  route,
  geometry,
  selectedStopId,
  className,
}: {
  route: Route;
  geometry: RouteGeometry;
  selectedStopId?: string;
  className?: string;
}) {
  const project = projector(geometry);
  const points = geometry.points.map(project);
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div
      className={cn(
        "map-grid relative h-44 w-full overflow-hidden rounded-2xl border border-slate-100 bg-[#eaf1f8]",
        className,
      )}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label={`Schematic preview of ${route.name}`}
      >
        <polyline points={path} fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={path} fill="none" stroke={route.color} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
        {route.stops.map((stop, index) => {
          if (stop.lat == null || stop.lng == null) return null;
          const point = project({ lat: stop.lat, lng: stop.lng });
          const selected = stop.id === selectedStopId;
          return (
            <g key={stop.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={selected ? 2.4 : 1.6}
                fill={selected ? route.color : "white"}
                stroke={route.color}
                strokeWidth="0.5"
              />
              <text
                x={point.x}
                y={point.y + 0.5}
                textAnchor="middle"
                fontSize="1.6"
                fontWeight="800"
                fill={selected ? "white" : "#122946"}
              >
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <span className="absolute bottom-2 right-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-500">
        Schematic · not to scale
      </span>
    </div>
  );
}
