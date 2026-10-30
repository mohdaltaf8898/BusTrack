"use client";

import * as L from "leaflet";
import { LocateFixed, Navigation, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COLLEGE_COORDINATES } from "@/data/routes";
import { positionAtDistance } from "@/lib/geo";
import { bearingToCompass } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchematicRouteMap } from "@/components/maps/schematic-map";
import { MapSkeleton } from "@/components/maps/map-skeleton";
import type { LiveMapProps } from "@/components/maps/map-types";
import type { Coordinates } from "@/lib/types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function busIcon(bearing: number, offline: boolean, delayed: boolean) {
  const tone = offline ? "bus-marker--offline" : delayed ? "bus-marker--delayed" : "";
  return L.divIcon({
    className: "bus-marker",
    html: `<div class="${tone}" style="position:relative;width:44px;height:44px">
      <div class="bus-marker__pulse"></div>
      <div class="bus-marker__body" style="--bearing:${bearing}deg">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 6v6M16 6v6M2 12h19.6M2 12v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5"/>
          <path d="M4 4h16a2 2 0 0 1 2 2v6H2V6a2 2 0 0 1 2-2Z"/>
          <path d="M6 19v2M18 19v2"/>
        </svg>
      </div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function stopIcon(index: number, selected: boolean) {
  return L.divIcon({
    className: cn("stop-marker", selected && "stop-marker--selected"),
    html: `<div class="stop-marker__dot">${index + 1}</div>`,
    iconSize: selected ? [34, 34] : [28, 28],
    iconAnchor: selected ? [17, 17] : [14, 14],
  });
}

function collegeIcon() {
  return L.divIcon({
    className: "college-marker",
    html: `<div class="college-marker__body">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function pathUpToDistance(geometry: LiveMapProps["geometry"], distance: number): Coordinates[] {
  const clamped = Math.max(0, Math.min(geometry.totalDistanceMeters, distance));
  const points: Coordinates[] = [];
  geometry.points.forEach((point, index) => {
    if (geometry.cumulative[index] < clamped) points.push(point);
  });
  const atDistance = positionAtDistance(geometry, clamped);
  points.push({ lat: atDistance.lat, lng: atDistance.lng });
  return points;
}

interface MapLayers {
  casing: L.Polyline;
  route: L.Polyline;
  progress: L.Polyline;
  stops: L.LayerGroup;
  college: L.Marker;
  bus: L.Marker;
  tiles: L.TileLayer;
}

export function LiveMapInner({
  route,
  geometry,
  busPosition,
  progressDistanceMeters,
  busStatus,
  selectedStopId,
  isStale,
  isLiveData,
  browserOffline = false,
  className,
  onSelectStop,
  showControls = true,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<MapLayers | null>(null);
  const tileErrorsRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(browserOffline);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useEffect(() => {
    if (browserOffline) setMapFailed(true);
  }, [browserOffline]);

  useEffect(() => {
    if (mapFailed || tilesLoaded) return;
    const timeout = window.setTimeout(() => setMapFailed(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [mapFailed, tilesLoaded]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center = geometry.points[0] ?? COLLEGE_COORDINATES;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      zoomSnap: 0.25,
      minZoom: 9,
      maxZoom: 18,
    }).setView([center.lat, center.lng], 12);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      crossOrigin: true,
    });
    tiles.on("tileerror", () => {
      tileErrorsRef.current += 1;
      if (tileErrorsRef.current >= 3) setMapFailed(true);
    });
    tiles.on("load", () => setTilesLoaded(true));
    tiles.addTo(map);

    const casing = L.polyline([], {
      color: "#ffffff",
      weight: 10,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    const routeLine = L.polyline([], {
      color: route.color,
      weight: 5,
      opacity: 0.78,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    const progress = L.polyline([], {
      color: route.color,
      weight: 7,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    const stops = L.layerGroup().addTo(map);
    const college = L.marker([COLLEGE_COORDINATES.lat, COLLEGE_COORDINATES.lng], {
      icon: collegeIcon(),
      zIndexOffset: 300,
    })
      .addTo(map)
      .bindTooltip("<strong>College</strong><br/>Lords Institute of Engineering & Technology", {
        direction: "top",
        offset: [0, -18],
      });
    const bus = L.marker([center.lat, center.lng], {
      icon: busIcon(0, false, false),
      zIndexOffset: 1000,
    }).addTo(map);

    layersRef.current = { casing, route: routeLine, progress, stops, college, bus, tiles };
    mapRef.current = map;
    setMapReady(true);

    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      setMapReady(false);
    };
    // The map is created once; later effects keep its layers synchronized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!mapReady || !map || !layers) return;
    const all = geometry.points.map((point) => [point.lat, point.lng] as [number, number]);
    const traveled = pathUpToDistance(geometry, progressDistanceMeters).map(
      (point) => [point.lat, point.lng] as [number, number],
    );
    layers.casing.setLatLngs(all);
    layers.route.setLatLngs(all);
    layers.route.setStyle({ color: route.color });
    layers.progress.setLatLngs(traveled);
    layers.progress.setStyle({ color: route.color });
    layers.college.setLatLng([COLLEGE_COORDINATES.lat, COLLEGE_COORDINATES.lng]);
  }, [mapReady, geometry, progressDistanceMeters, route.color]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || geometry.points.length === 0) return;
    const bounds = L.latLngBounds(
      geometry.points.map((point) => [point.lat, point.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [38, 38], maxZoom: 14, animate: false });
    map.invalidateSize();
    // Refit only when the selected route geometry changes, not on every position tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, route.id, geometry.totalDistanceMeters]);

  useEffect(() => {
    const layers = layersRef.current;
    if (!mapReady || !layers) return;
    layers.stops.clearLayers();
    route.stops.forEach((stop, index) => {
      if (stop.lat == null || stop.lng == null) return;
      const marker = L.marker([stop.lat, stop.lng], {
        icon: stopIcon(index, stop.id === selectedStopId),
        zIndexOffset: stop.id === selectedStopId ? 700 : 400,
      });
      marker.bindTooltip(
        `<strong>${escapeHtml(stop.name)}</strong><br/><span>Stop ${index + 1} of ${route.stops.length}</span>`,
        { direction: "top", offset: [0, -14] },
      );
      marker.on("click", () => onSelectStop?.(stop.id));
      layers.stops.addLayer(marker);
    });
  }, [mapReady, route.stops, selectedStopId, onSelectStop, route.stops.length]);

  useEffect(() => {
    const layers = layersRef.current;
    if (!mapReady || !layers) return;
    layers.bus.setLatLng([busPosition.lat, busPosition.lng]);
    layers.bus.setIcon(
      busIcon(busPosition.bearing, busStatus === "offline", busStatus === "delayed"),
    );
    const tooltip = `<strong>${escapeHtml(route.busNumber)} · ${escapeHtml(route.code)}</strong><br/>${
      busStatus === "offline" ? "Last known position" : "Current position"
    } (${isStale ? "last known position" : isLiveData ? "device GPS" : "simulated"})`;
    if (layers.bus.getTooltip()) {
      layers.bus.setTooltipContent(tooltip);
    } else {
      layers.bus.bindTooltip(tooltip, { direction: "top", offset: [0, -22] });
    }
  }, [mapReady, busPosition.lat, busPosition.lng, busPosition.bearing, busStatus, isLiveData, isStale, route.busNumber, route.code]);

  const centerOnBus = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([busPosition.lat, busPosition.lng], Math.max(map.getZoom(), 14), {
      duration: 0.7,
    });
  };

  const retryTiles = () => {
    const layers = layersRef.current;
    tileErrorsRef.current = 0;
    setMapFailed(false);
    setTilesLoaded(false);
    layers?.tiles.redraw();
    mapRef.current?.invalidateSize();
  };

  return (
    <div
      className={cn(
        "relative h-[340px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-[#eaf1f8] shadow-card md:h-[440px]",
        className,
      )}
    >
      <div
        ref={containerRef}
        className={cn("h-full w-full", mapFailed && "pointer-events-none opacity-0")}
        aria-label={`Map for ${route.name}`}
        aria-hidden={mapFailed}
      />
      {!mapFailed && (
        <>
          {(!mapReady || !tilesLoaded) && (
            <MapSkeleton className="pointer-events-none absolute inset-0 h-full w-full rounded-none" />
          )}
          <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-navy-900 shadow-card">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: route.color }} />
              {route.code} · {route.busNumber}
            </span>
            <Badge
              tone={isStale ? "amber" : isLiveData ? "green" : "blue"}
              className="pointer-events-auto"
            >
              {isStale ? "Last known position" : isLiveData ? "Device GPS" : "Simulated position"}
            </Badge>
          </div>
          {showControls && (
            <div className="absolute bottom-16 right-3 z-[500] flex flex-col gap-2">
              <Button
                type="button"
                size="icon"
                onClick={centerOnBus}
                aria-label="Center map on bus"
                title="Center on bus"
                className="rounded-2xl bg-white text-navy-900 shadow-float hover:bg-brand-50"
              >
                <LocateFixed className="h-5 w-5" />
              </Button>
              {isStale && (
                <Button
                  type="button"
                  size="icon"
                  onClick={retryTiles}
                  aria-label="Retry map tiles"
                  title="Retry map tiles"
                  variant="outline"
                  className="rounded-2xl bg-white shadow-float"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-card">
            <Navigation className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Heading {bearingToCompass(busPosition.bearing)} · {Math.round(busPosition.bearing)}°
          </div>
        </>
      )}
      {mapFailed && (
        <div className="absolute inset-0 z-[550]">
          <SchematicRouteMap
            route={route}
            geometry={geometry}
            busPosition={busPosition}
            busStatus={busStatus}
            selectedStopId={selectedStopId}
            className="rounded-none"
            reason={
              browserOffline
                ? "Browser is offline. Showing the cached route schematic and last known bus position."
                : "OpenStreetMap tiles are unavailable. Showing the same route as a schematic."
            }
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={retryTiles}
            className="absolute right-4 top-16 z-10 bg-white shadow-card"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry tiles
          </Button>
        </div>
      )}
      {browserOffline && (
        <div className="absolute right-3 top-3 z-[600] rounded-xl bg-amber-100 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 shadow-card">
          <span className="inline-flex items-center gap-1.5">
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            Offline
          </span>
        </div>
      )}
      <span className="sr-only">
        The bus marker, route line and stop markers use the same ordered route coordinates.
      </span>
    </div>
  );
}
