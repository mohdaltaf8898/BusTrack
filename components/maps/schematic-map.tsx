"use client";

import { AlertTriangle, Navigation } from "lucide-react";
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
  const selected = route.stops.find((stop) => stop.id === selectedStopId) ?? route.stops[0];

  return (
    <div
      className={cn(
        "relative h-full min-h-[340px] w-full overflow-hidden rounded-3xl bg-[#eaf1f8] md:min-h-[440px]",
        className,
      )}
    >
      <div className="map-grid absolute inset-0" />
      <div className="absolute left-4 top-4 z-10 max-w-[80%] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-amber-900 shadow-card">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
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
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-navy-800">
        <span className="rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm">
          {route.code} · {route.busNumber}
        </span>
        <span className="rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm">
          Selected: {selected.name}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm">
          <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          Schematic · not to scale
        </span>
      </div>
    </div>
  );
}
