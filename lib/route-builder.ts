import type { Coordinates, Route, RouteStatus, Stop } from "@/lib/types";

export interface RouteSeedStop {
  id: string;
  name: string;
  coordinates: Coordinates;
  landmark?: string;
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
  status: RouteStatus;
  stops: RouteSeedStop[];
  /** One array of intermediate shape points between each consecutive stop pair. */
  legs: Coordinates[][];
}

function samePoint(a: Coordinates, b: Coordinates) {
  return Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
}

export function buildRoute(seed: RouteSeed): Route {
  if (seed.stops.length < 2) {
    throw new Error(`Route ${seed.id} needs at least two stops.`);
  }
  if (seed.legs.length !== seed.stops.length - 1) {
    throw new Error(`Route ${seed.id} needs one leg per stop-to-stop segment.`);
  }

  const shape: Coordinates[] = [seed.stops[0].coordinates];
  const stopIndices: number[] = [0];

  for (let legIndex = 0; legIndex < seed.legs.length; legIndex += 1) {
    for (const via of seed.legs[legIndex]) {
      if (!samePoint(shape[shape.length - 1], via)) shape.push(via);
    }
    const destination = seed.stops[legIndex + 1].coordinates;
    if (!samePoint(shape[shape.length - 1], destination)) shape.push(destination);
    stopIndices.push(shape.length - 1);
  }

  const stops: Stop[] = seed.stops.map((stop, index) => ({
    id: stop.id,
    name: stop.name,
    lat: stop.coordinates.lat,
    lng: stop.coordinates.lng,
    order: index + 1,
    landmark: stop.landmark,
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
    color: seed.color,
    averageSpeedKmh: seed.averageSpeedKmh,
    estimatedDurationMinutes: seed.estimatedDurationMinutes,
    status: seed.status,
  };
}
