import { sampleRoutes } from "@/data/routes";
import { backendConfig } from "@/lib/config";
import {
  calculateStopEtas,
  getBusStatus,
  getProgressPercent,
  getTrafficCondition,
} from "@/lib/eta";
import { buildRouteGeometry, positionAtDistance, projectPointOnRoute } from "@/lib/geo";
import { createSimulationState } from "@/lib/simulation";
import type {
  AppState,
  Bus,
  BusStatus,
  DemoDriver,
  PointOnRoute,
  RemoteBusLocation,
  Route,
  RouteGeometry,
  SimulationState,
  Stop,
  StopEta,
  TrafficCondition,
} from "@/lib/types";
import { clamp } from "@/lib/utils";

export interface RouteSnapshot {
  route: Route;
  bus?: Bus;
  driver?: DemoDriver;
  geometry: RouteGeometry;
  simulation: SimulationState;
  etaSimulation: SimulationState;
  remoteLocation?: RemoteBusLocation;
  isLiveData: boolean;
  isStale: boolean;
  busPosition: PointOnRoute;
  effectiveDistanceMeters: number;
  traffic: TrafficCondition;
  stopEtas: StopEta[];
  selectedStop: Stop;
  selectedStopEta: StopEta;
  busStatus: BusStatus;
  progressPercent: number;
  lastUpdateAt: number;
  dataMode: "live" | "simulation";
  sourceLabel: "Device GPS" | "Last known GPS" | "Simulated";
}

function safeGeometry(route: Route): RouteGeometry {
  try {
    return buildRouteGeometry(route);
  } catch {
    return buildRouteGeometry(sampleRoutes[0]);
  }
}

export function deriveRouteSnapshot(
  state: AppState,
  routeId: string,
  selectedStopId?: string,
): RouteSnapshot {
  const route = state.routes.find((item) => item.id === routeId) ?? state.routes[0] ?? sampleRoutes[0];
  const geometry = safeGeometry(route);
  const simulation =
    state.simulations[route.id] ?? createSimulationState(route.id, state.currentTime);
  const remoteLocation = state.remoteLocations[route.id];
  const now = state.currentTime;
  const staleMs = backendConfig.staleLocationSeconds * 1000;
  const isLiveData = Boolean(
    backendConfig.publicConfigured &&
      remoteLocation?.source === "gps" &&
      now - remoteLocation.recordedAt <= staleMs,
  );
  const isStale = remoteLocation
    ? now - remoteLocation.recordedAt > staleMs
    : simulation.tripStatus !== "idle" && now - simulation.lastUpdateAt > staleMs;

  let effectiveDistanceMeters = simulation.distanceMeters;
  let busPosition = positionAtDistance(geometry, effectiveDistanceMeters);

  if (remoteLocation) {
    const projection = projectPointOnRoute(
      { lat: remoteLocation.lat, lng: remoteLocation.lng },
      geometry,
    );
    effectiveDistanceMeters = clamp(
      projection.distanceAlongMeters,
      0,
      geometry.totalDistanceMeters,
    );
    const routePoint = positionAtDistance(geometry, effectiveDistanceMeters);
    busPosition = {
      lat: remoteLocation.lat,
      lng: remoteLocation.lng,
      bearing: remoteLocation.heading ?? routePoint.bearing,
      segmentIndex: routePoint.segmentIndex,
      progress: geometry.totalDistanceMeters
        ? effectiveDistanceMeters / geometry.totalDistanceMeters
        : 0,
    };
  }

  // Backend-authored delay reports (flagged simulated:false) increase the ETA
  // without pretending they came from the local movement engine.
  const backendDelaySeconds = state.delayReports
    .filter(
      (report) =>
        report.routeId === route.id &&
        !report.simulated &&
        now - report.createdAt < 1000 * 60 * 30,
    )
    .reduce((sum, report) => sum + Math.max(0, report.delaySeconds), 0);
  const baseEtaSimulation: SimulationState = remoteLocation
    ? {
        ...simulation,
        distanceMeters: effectiveDistanceMeters,
        lastUpdateAt: remoteLocation.recordedAt,
        isRunning: isLiveData,
        isSharing: isLiveData,
        tripStatus: isLiveData ? "active" : "offline",
      }
    : simulation;
  const etaSimulation: SimulationState = {
    ...baseEtaSimulation,
    delaySeconds: baseEtaSimulation.delaySeconds + backendDelaySeconds,
  };

  const traffic = getTrafficCondition(route, simulation.elapsedSeconds, effectiveDistanceMeters);
  const resolvedStopId =
    selectedStopId ??
    route.stops.find((stop) => stop.id === state.selectedStopId)?.id ??
    route.stops[Math.min(2, route.stops.length - 1)]?.id ??
    route.stops[0].id;
  const stopEtas = calculateStopEtas({
    route,
    geometry,
    simulation: etaSimulation,
    traffic,
    now,
    selectedStopId: resolvedStopId,
  });
  const selectedStopEta =
    stopEtas.find((item) => item.stop.id === resolvedStopId) ?? stopEtas[0];
  const selectedStop = selectedStopEta.stop;
  const busStatus = getBusStatus({
    simulation: etaSimulation,
    selectedStopEta,
    traffic,
    routeStatus: route.status,
    isStale,
  });
  const bus = state.buses.find((item) => item.routeId === route.id);
  const driver = state.drivers.find((item) => item.id === bus?.driverId);

  return {
    route,
    bus,
    driver,
    geometry,
    simulation,
    etaSimulation,
    remoteLocation,
    isLiveData,
    isStale,
    busPosition,
    effectiveDistanceMeters,
    traffic,
    stopEtas,
    selectedStop,
    selectedStopEta,
    busStatus,
    progressPercent: getProgressPercent(geometry, effectiveDistanceMeters),
    lastUpdateAt: etaSimulation.lastUpdateAt,
    dataMode: isLiveData ? "live" : "simulation",
    sourceLabel: isLiveData
      ? "Device GPS"
      : remoteLocation
        ? "Last known GPS"
        : "Simulated",
  };
}
