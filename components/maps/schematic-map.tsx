"use client";

import { Info } from "lucide-react";
import type { BusStatus, Coordinates, PointOnRoute, Route, RouteGeometry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SchematicMapProps {
  route: Route;
  geometry: RouteGeometry;
  busPosition: PointOnRoute;
  busStatus: BusStatus;
  selectedStopId: string;
  className?: string;
  reason?: string;
}

function createProjector(geometry: RouteGeometry) {
  const { minLat, maxLat, minLng, maxLng } = geometry.bounds;
  const meanLat = (minLat + maxLat) / 2;
  const lngScale = Math.cos((meanLat * Math.PI) / 180);
  const maxX = Math.max((maxLng - minLng) * lngScale, 0.001);
  const maxY = Math.max(maxLat - minLat, 0.001);
  const range = Math.max(maxX, maxY);
  const offsetX = (range - maxX) / 2;
  const offsetY = (range - maxY) / 2;
  return (point: Coordinates) => ({
    x: 8 + (((point.lng - minLng) * lngScale + offsetX) / range) * 84,
    y: 8 + (((maxLat - point.lat) + offsetY) / range) * 84,
  });
}

export function SchematicRouteMap({
  route,
  geometry,
  busPosition,
  busStatus,
  selectedStopId,
  className,
  reason = "OpenStreetMap tiles are unavailable. A schematic of the same route is shown.",
}: SchematicMapProps) {
  const project = createProjector(geometry);
  const routePoints = geometry.points.map(project);
  const path = routePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const bus = project(busPosition);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl bg-[var(--color-map-surface)]",
        className,
      )}
    >
      <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-card">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span>{reason}</span>
        </div>
      </div>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Schematic map for ${route.name}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <polyline
          points={path}
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <polyline
          points={path}
          fill="none"
          stroke={route.color}
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {route.stops.map((stop, index) => {
          if (stop.lat == null || stop.lng == null) return null;
          const point = project({ lat: stop.lat, lng: stop.lng });
          const active = stop.id === selectedStopId;
          return (
            <g key={stop.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={active ? 2.1 : 1.45}
                fill={active ? route.color : "white"}
                stroke={active ? "white" : "#94a3b8"}
                strokeWidth="0.55"
              />
              <text
                x={point.x}
                y={point.y + 0.45}
                textAnchor="middle"
                fontSize="1.5"
                fontWeight="800"
                fill={active ? "white" : "#122946"}
              >
                {index + 1}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${bus.x} ${bus.y}) rotate(${busPosition.bearing})`}>
          <circle r="3.3" fill={busStatus === "offline" ? "#64748b" : "#1c5ff0"} opacity="0.2" />
          <circle r="2" fill={busStatus === "offline" ? "#64748b" : "#1c5ff0"} stroke="white" strokeWidth="0.6" />
          <path d="M0 -1 L0.65 0.35 L0 0 L-0.65 0.35 Z" fill="white" />
        </g>
      </svg>
      <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-card">
        Schematic route · not to scale
      </div>
    </div>
  );
}
