import { distanceToPolylineMeters, isWithinHyderabadArea, isValidCoordinate } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

export const MAX_LOCATION_AGE_SECONDS = 60;
export const MAX_FUTURE_SKEW_SECONDS = 15;
export const MAX_OFF_ROUTE_METERS = 800;

export interface TimingResult {
  valid: boolean;
  error?: string;
  ageSeconds: number;
}

export function validateLocationTiming(recordedAt: string, now = Date.now()): TimingResult {
  const timestamp = new Date(recordedAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return { valid: false, error: "recordedAt is not a valid ISO timestamp.", ageSeconds: Infinity };
  }
  const ageSeconds = (now - timestamp) / 1000;
  if (ageSeconds > MAX_LOCATION_AGE_SECONDS) {
    return {
      valid: false,
      error: `Location is stale (${Math.round(ageSeconds)}s old); updates must be under ${MAX_LOCATION_AGE_SECONDS}s.`,
      ageSeconds,
    };
  }
  if (ageSeconds < -MAX_FUTURE_SKEW_SECONDS) {
    return {
      valid: false,
      error: "Location timestamp is too far in the future.",
      ageSeconds,
    };
  }
  return { valid: true, ageSeconds };
}

export function validateGpsPoint(
  lat: number,
  lng: number,
  shape: Coordinates[],
): { valid: boolean; error?: string; offRouteMeters?: number } {
  if (!isValidCoordinate(lat, lng)) {
    return { valid: false, error: "Coordinates are outside valid latitude/longitude bounds." };
  }
  if (!isWithinHyderabadArea(lat, lng)) {
    return { valid: false, error: "Coordinates are outside the configured Hyderabad service area." };
  }
  if (shape.length < 2) {
    return { valid: false, error: "This route has no usable geometry." };
  }
  const offRouteMeters = distanceToPolylineMeters({ lat, lng }, shape);
  if (!Number.isFinite(offRouteMeters) || offRouteMeters > MAX_OFF_ROUTE_METERS) {
    return {
      valid: false,
      error: `Coordinates are ${Math.round(offRouteMeters)}m from the configured route (limit ${MAX_OFF_ROUTE_METERS}m).`,
      offRouteMeters,
    };
  }
  return { valid: true, offRouteMeters };
}
