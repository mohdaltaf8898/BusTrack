import type {
  ArrivalStatus,
  BusStatus,
  Route,
  RouteGeometry,
  SimulationState,
  StopEta,
  TrafficCondition,
} from "@/lib/types";

const MINIMUM_SPEED_KMH = 5;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 997;
  }
  return hash;
}

/**
 * Deterministic, simulated traffic. A lower factor means a lower effective
 * average speed, so ETAs rise in traffic "pockets". This is not live traffic.
 */
export function getTrafficCondition(
  route: Route,
  elapsedSeconds: number,
  distanceMeters: number,
): TrafficCondition {
  const seed = hashString(route.id) / 997;
  const wave = Math.sin(elapsedSeconds / 47 + seed * 8 + distanceMeters / 2600);
  const secondary = Math.sin(elapsedSeconds / 113 + distanceMeters / 5100 + seed * 3);
  const factor = Math.max(
    0.62,
    Math.min(0.96, 0.86 + wave * 0.09 + secondary * 0.03),
  );
  if (factor < 0.72) {
    return {
      label: "Heavy",
      factor,
      description: "Simulated congestion is reducing the average speed.",
    };
  }
  if (factor < 0.84) {
    return {
      label: "Moderate",
      factor,
      description: "Simulated moderate traffic is included in the ETA.",
    };
  }
  return {
    label: "Light",
    factor,
    description: "Simulated traffic is light on this section.",
  };
}

/** Road-geometry distance divided by a configurable average speed, plus delay. */
export function calculateEtaSeconds(
  distanceMeters: number,
  effectiveSpeedKmh: number,
  delaySeconds = 0,
): number {
  const distance = Math.max(0, distanceMeters);
  const speed = Math.max(MINIMUM_SPEED_KMH, effectiveSpeedKmh);
  const travelSeconds = distance / ((speed * 1000) / 3600);
  return Math.max(0, Math.round(travelSeconds + Math.max(0, delaySeconds)));
}

export interface StopEtaOptions {
  route: Route;
  geometry: RouteGeometry;
  simulation: SimulationState;
  traffic: TrafficCondition;
  now: number;
  selectedStopId: string;
}

export function calculateStopEtas({
  route,
  geometry,
  simulation,
  traffic,
  now,
  selectedStopId,
}: StopEtaOptions): StopEta[] {
  const effectiveSpeedKmh = Math.max(
    MINIMUM_SPEED_KMH,
    route.averageSpeedKmh * traffic.factor,
  );

  return route.stops.map((stop, index) => {
    const stopDistance = geometry.stopDistances[index] ?? 0;
    const hasDeparted = simulation.distanceMeters > stopDistance + 35;
    const distanceMeters = Math.max(0, stopDistance - simulation.distanceMeters);
    const etaSeconds = hasDeparted
      ? 0
      : calculateEtaSeconds(
          distanceMeters,
          effectiveSpeedKmh,
          simulation.delaySeconds,
        );

    let status: ArrivalStatus;
    if (simulation.tripStatus === "completed") {
      status = hasDeparted ? "departed" : "completed";
    } else if (hasDeparted) {
      status = "departed";
    } else if (distanceMeters <= 140 || etaSeconds <= 60) {
      status = "arriving";
    } else if (etaSeconds <= 240) {
      status = "approaching";
    } else {
      status = "upcoming";
    }

    return {
      stop,
      etaSeconds,
      etaAt: now + etaSeconds * 1000,
      distanceMeters,
      status,
      isSelected: stop.id === selectedStopId,
    };
  });
}

export interface BusStatusOptions {
  simulation: SimulationState;
  selectedStopEta?: StopEta;
  traffic: TrafficCondition;
  routeStatus: Route["status"];
  isStale: boolean;
}

export function getBusStatus({
  simulation,
  selectedStopEta,
  traffic,
  routeStatus,
  isStale,
}: BusStatusOptions): BusStatus {
  if (
    routeStatus === "maintenance" ||
    simulation.tripStatus === "idle" ||
    simulation.tripStatus === "offline" ||
    !simulation.isSharing ||
    isStale
  ) {
    return "offline";
  }
  if (
    simulation.tripStatus === "completed" ||
    selectedStopEta?.status === "arriving" ||
    (selectedStopEta?.etaSeconds ?? Infinity) <= 120
  ) {
    return "arriving";
  }
  if (simulation.delaySeconds >= 60 || traffic.label === "Heavy") {
    return "delayed";
  }
  return "on-time";
}

export function getProgressPercent(
  geometry: RouteGeometry,
  distanceMeters: number,
): number {
  if (geometry.totalDistanceMeters === 0) return 0;
  return Math.max(
    0,
    Math.min(100, (distanceMeters / geometry.totalDistanceMeters) * 100),
  );
}

export function describeEtaMethod(route: Route, traffic: TrafficCondition): string {
  return `Estimated from ${route.averageSpeedKmh} km/h demo speed and polyline distance, reduced to ${Math.round(
    route.averageSpeedKmh * traffic.factor,
  )} km/h for simulated ${traffic.label.toLowerCase()} traffic. Straight-line distance is not road distance; this is an estimate, not a guarantee.`;
}
