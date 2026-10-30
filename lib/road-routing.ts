import { haversineMeters, isWithinHyderabadArea } from "@/lib/geo";
import type { Coordinates, Route } from "@/lib/types";

export interface RoadGeometry {
  coordinateKey: string;
  shape: Coordinates[];
  stopIndices: number[];
}

/** Includes missing stops and their order so an old response cannot overwrite an edit. */
export function routeCoordinateKey(route: Pick<Route, "stops">): string {
  return route.stops.map((stop) =>
    stop.lat == null || stop.lng == null
      ? `${stop.id}:?`
      : `${stop.id}:${stop.lat.toFixed(7)},${stop.lng.toFixed(7)}`,
  ).join("|");
}

export function mappedStopCount(route: Pick<Route, "stops">): number {
  return route.stops.filter((stop) => stop.lat != null && stop.lng != null).length;
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{ geometry?: { coordinates?: unknown } }>;
  waypoints?: Array<{ location?: unknown; distance?: unknown }>;
}

/** Converts an OSRM full-resolution route into ordered geometry and stop indices. */
export function roadGeometryFromOsrm(route: Route, payload: OsrmResponse): RoadGeometry {
  const rawShape = payload.routes?.[0]?.geometry?.coordinates;
  const mappedStops = route.stops.filter((stop) => stop.lat != null && stop.lng != null);
  if (payload.code !== "Ok" || !Array.isArray(rawShape) || rawShape.length < 2 || rawShape.length > 30_000 ||
      !Array.isArray(payload.waypoints) || payload.waypoints.length !== mappedStops.length) {
    throw new Error("Road routing returned an incomplete route.");
  }
  const shape = rawShape.map((value: unknown) => {
    if (!Array.isArray(value) || value.length < 2 || typeof value[0] !== "number" ||
        typeof value[1] !== "number" || !isWithinHyderabadArea(value[1], value[0])) {
      throw new Error("Road routing returned invalid coordinates.");
    }
    return { lat: value[1], lng: value[0] };
  });

  let cursor = 0;
  const mappedIndices = payload.waypoints.map((waypoint, index) => {
    if (!Array.isArray(waypoint.location) || waypoint.location.length < 2 ||
        typeof waypoint.location[0] !== "number" || typeof waypoint.location[1] !== "number") {
      throw new Error("Road routing returned an invalid stop.");
    }
    const snapped = { lat: waypoint.location[1], lng: waypoint.location[0] };
    const original = { lat: mappedStops[index].lat as number, lng: mappedStops[index].lng as number };
    if (!isWithinHyderabadArea(snapped.lat, snapped.lng) || haversineMeters(original, snapped) > 1_500) {
      throw new Error("A stop could not be matched to a nearby road.");
    }
    // OSRM's full overview contains every snapped waypoint in order. Looking
    // forward prevents a repeated road/loop from assigning a stop to an old leg.
    const found = shape.findIndex((point, shapeIndex) =>
      shapeIndex >= cursor && haversineMeters(point, snapped) <= 2,
    );
    if (found < 0) throw new Error("Road routing omitted a stop from its route.");
    cursor = found;
    return found;
  });

  let mappedIndex = 0;
  const stopIndices = route.stops.map((stop) =>
    stop.lat == null || stop.lng == null ? -1 : mappedIndices[mappedIndex++],
  );
  return { coordinateKey: routeCoordinateKey(route), shape, stopIndices };
}
