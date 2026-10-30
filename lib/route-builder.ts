import type { Coordinates, Route, RouteStatus, Stop } from "@/lib/types";

export interface RouteSeedStop {
  id: string;
  name: string;
  /** Omitted coordinates are never replaced with invented stop positions. */
  coordinates: Coordinates | null;
  landmark?: string;
  scheduledTime?: string | null;
  locationSource?: string | null;
  locationReference?: string | null;
  note?: string | null;
}

export interface RouteSeed {
  id: string;
  code: string;
  name: string;
  busNumber: string;
  startLocation: string;
  destination: string;
  description: string;
  color: string;
  averageSpeedKmh: number;
  estimatedDurationMinutes: number;
  scheduledDurationMinutes?: number | null;
  scheduleYear?: string | null;
  geometrySource?: Route["geometrySource"];
  status: RouteStatus;
  stops: RouteSeedStop[];
  /** Intermediate shape points between consecutive mapped stop pairs. */
  legs: Coordinates[][];
}

function samePoint(a: Coordinates, b: Coordinates) {
  return Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
}

export function buildRoute(seed: RouteSeed): Route {
  if (seed.stops.length < 2) throw new Error(`Route ${seed.id} needs at least two stops.`);
  if (seed.legs.length !== seed.stops.length - 1) {
    throw new Error(`Route ${seed.id} needs one leg per stop-to-stop segment.`);
  }

  const shape: Coordinates[] = [];
  const stopIndices: number[] = [];
  seed.stops.forEach((stop, index) => {
    if (!stop.coordinates) {
      stopIndices.push(-1);
      return;
    }
    if (index > 0 && seed.stops[index - 1].coordinates && shape.length > 0) {
      for (const via of seed.legs[index - 1]) {
        if (!samePoint(shape[shape.length - 1], via)) shape.push(via);
      }
    }
    if (shape.length === 0 || !samePoint(shape[shape.length - 1], stop.coordinates)) {
      shape.push(stop.coordinates);
    }
    stopIndices.push(shape.length - 1);
  });
  if (shape.length < 2) throw new Error(`Route ${seed.id} needs two mapped locations.`);

  const stops: Stop[] = seed.stops.map((stop, index) => ({
    id: stop.id,
    name: stop.name,
    lat: stop.coordinates?.lat ?? null,
    lng: stop.coordinates?.lng ?? null,
    order: index + 1,
    landmark: stop.landmark,
    scheduledTime: stop.scheduledTime ?? null,
    locationSource: stop.locationSource ?? null,
    locationReference: stop.locationReference ?? null,
    note: stop.note ?? null,
  }));

  return {
    id: seed.id,
    code: seed.code,
    name: seed.name,
    busNumber: seed.busNumber,
    startLocation: seed.startLocation,
    destination: seed.destination,
    description: seed.description,
    stops,
    shape,
    stopIndices,
    geometrySource: seed.geometrySource ?? "straight",
    scheduleYear: seed.scheduleYear,
    scheduledDurationMinutes: seed.scheduledDurationMinutes,
    color: seed.color,
    averageSpeedKmh: seed.averageSpeedKmh,
    estimatedDurationMinutes: seed.estimatedDurationMinutes,
    status: seed.status,
  };
}
