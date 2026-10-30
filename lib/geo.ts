import type {
  Coordinates,
  PointOnRoute,
  Route,
  RouteGeometry,
} from "@/lib/types";

const EARTH_RADIUS_METERS = 6_371_008.8;
const METERS_PER_DEGREE_LAT = 110_574;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingBetween(a: Coordinates, b: Coordinates): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function bearingToCompass(bearing: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(bearing / 45) % 8];
}

export function buildRouteGeometry(route: Route): RouteGeometry {
  const points = route.shape;
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] + haversineMeters(points[index - 1], points[index]),
    );
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);

  return {
    points,
    cumulative,
    stopDistances: route.stopIndices.map((index) => index < 0 ? null : (cumulative[index] ?? null)),
    totalDistanceMeters: cumulative[cumulative.length - 1] ?? 0,
    bounds: {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    },
  };
}

export function positionAtDistance(
  geometry: RouteGeometry,
  distanceMeters: number,
): PointOnRoute {
  const total = geometry.totalDistanceMeters;
  const distance = Math.max(0, Math.min(total, distanceMeters));

  if (total === 0 || geometry.points.length === 1) {
    const point = geometry.points[0];
    return {
      ...point,
      bearing: 0,
      segmentIndex: 0,
      progress: 0,
    };
  }

  let segmentIndex = 0;
  while (
    segmentIndex < geometry.cumulative.length - 2 &&
    geometry.cumulative[segmentIndex + 1] < distance
  ) {
    segmentIndex += 1;
  }

  const start = geometry.points[segmentIndex];
  const end = geometry.points[segmentIndex + 1];
  const segmentStart = geometry.cumulative[segmentIndex];
  const segmentEnd = geometry.cumulative[segmentIndex + 1];
  const segmentLength = segmentEnd - segmentStart;
  const ratio = segmentLength === 0 ? 0 : (distance - segmentStart) / segmentLength;

  return {
    lat: start.lat + (end.lat - start.lat) * ratio,
    lng: start.lng + (end.lng - start.lng) * ratio,
    bearing: bearingBetween(start, end),
    segmentIndex,
    progress: total === 0 ? 0 : distance / total,
  };
}

export interface RouteProjection {
  distanceAlongMeters: number;
  offRouteMeters: number;
  nearestPoint: Coordinates;
}

/** Projects a GPS point onto a polyline using a local equirectangular approximation. */
export function projectPointOnRoute(
  point: Coordinates,
  geometry: RouteGeometry,
): RouteProjection {
  if (geometry.points.length === 0) {
    return {
      distanceAlongMeters: 0,
      offRouteMeters: Number.POSITIVE_INFINITY,
      nearestPoint: point,
    };
  }
  if (geometry.points.length === 1) {
    return {
      distanceAlongMeters: 0,
      offRouteMeters: haversineMeters(point, geometry.points[0]),
      nearestPoint: geometry.points[0],
    };
  }

  const origin = geometry.points[0];
  const meanLat = (geometry.bounds.minLat + geometry.bounds.maxLat) / 2;
  const metersPerDegreeLng = 111_320 * Math.cos(toRadians(meanLat));
  const toXY = (coordinate: Coordinates) => ({
    x: (coordinate.lng - origin.lng) * metersPerDegreeLng,
    y: (coordinate.lat - origin.lat) * METERS_PER_DEGREE_LAT,
  });

  const target = toXY(point);
  let best: RouteProjection = {
    distanceAlongMeters: 0,
    offRouteMeters: Number.POSITIVE_INFINITY,
    nearestPoint: geometry.points[0],
  };

  for (let index = 0; index < geometry.points.length - 1; index += 1) {
    const a = toXY(geometry.points[index]);
    const b = toXY(geometry.points[index + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const ratio = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((target.x - a.x) * dx + (target.y - a.y) * dy) / lengthSquared));
    const projectedX = a.x + dx * ratio;
    const projectedY = a.y + dy * ratio;
    const offRouteMeters = Math.hypot(target.x - projectedX, target.y - projectedY);
    if (offRouteMeters < best.offRouteMeters) {
      const segmentLength = geometry.cumulative[index + 1] - geometry.cumulative[index];
      best = {
        distanceAlongMeters: geometry.cumulative[index] + segmentLength * ratio,
        offRouteMeters,
        nearestPoint: {
          lat: origin.lat + projectedY / METERS_PER_DEGREE_LAT,
          lng: origin.lng + projectedX / metersPerDegreeLng,
        },
      };
    }
  }

  return best;
}

export function distanceToPolylineMeters(
  point: Coordinates,
  points: Coordinates[],
): number {
  const geometry = buildRouteGeometry({
    shape: points,
    stopIndices: [0, points.length - 1],
  } as Route);
  return projectPointOnRoute(point, geometry).offRouteMeters;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function isWithinHyderabadArea(lat: number, lng: number): boolean {
  return lat >= 17.15 && lat <= 17.7 && lng >= 78.1 && lng <= 78.8;
}
