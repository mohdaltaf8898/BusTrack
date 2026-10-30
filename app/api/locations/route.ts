import { NextResponse } from "next/server";
import { firstZodError, locationPayloadSchema } from "@/lib/validation";
import {
  ApiError,
  apiErrorResponse,
  createAdminClient,
  requireApiUser,
} from "@/lib/server/auth";
import {
  MAX_LOCATION_AGE_SECONDS,
  validateGpsPoint,
  validateLocationTiming,
} from "@/lib/server/location";
import { rateLimit } from "@/lib/server/rate-limit";
import type { Coordinates } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface LocationRow {
  id: string | number;
  bus_id: string;
  route_id: string | null;
  trip_id: string | null;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed_kmh: number | null;
  accuracy_meters: number | null;
  source: string | null;
  recorded_at: string;
  created_at?: string | null;
}

function publicLocation(row: LocationRow) {
  return {
    id: row.id,
    bus_id: row.bus_id,
    route_id: row.route_id,
    trip_id: row.trip_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    heading: row.heading,
    speed_kmh: row.speed_kmh,
    accuracy_meters: row.accuracy_meters,
    source: row.source ?? "gps",
    recorded_at: row.recorded_at,
  };
}

const LOCATION_FIELDS =
  "id,bus_id,route_id,trip_id,latitude,longitude,heading,speed_kmh,accuracy_meters,source,recorded_at";

const GUARDED_WRITE_ERRORS: Record<string, { status: number; message: string }> = {
  TRIP_NOT_FOUND: { status: 404, message: "The authorized trip was not found." },
  BUS_MISMATCH: { status: 400, message: "The bus does not belong to this trip." },
  SHARING_DISABLED: { status: 409, message: "Location sharing is no longer active for this trip." },
  ROUTE_MISMATCH: { status: 409, message: "The bus and trip route assignments do not match." },
  ROUTE_CHANGED: { status: 409, message: "The route changed during validation. Please retry." },
  ROUTE_NOT_FOUND: { status: 404, message: "The configured route was not found." },
  ROUTE_NOT_VERIFIED: { status: 409, message: "This route needs a verified GPS corridor before live location sharing can be used." },
  NOT_ASSIGNED: { status: 403, message: "This driver is no longer assigned to the bus and trip." },
  FORBIDDEN: { status: 403, message: "This account is no longer authorized to send GPS." },
  OUT_OF_AREA: { status: 422, message: "Coordinates are outside the configured Hyderabad service area." },
  STALE_LOCATION: { status: 422, message: "The location timestamp is stale or too far in the future." },
};

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request, ["driver", "admin"]);
    if (!rateLimit(`location:${auth.user.id}`, 90, 60_000)) {
      throw new ApiError(429, "RATE_LIMITED", "Too many location updates. Please wait a moment.");
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = locationPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, "INVALID_LOCATION", firstZodError(parsed.error));
    }
    const payload = parsed.data;
    const timing = validateLocationTiming(payload.recordedAt);
    if (!timing.valid) {
      throw new ApiError(422, "STALE_LOCATION", timing.error ?? "Invalid location timestamp.");
    }

    const client = auth.client;
    const { data: trip, error: tripError } = await client
      .from("trips")
      .select("id,bus_id,route_id,driver_id,status,sharing_enabled")
      .eq("id", payload.tripId)
      .maybeSingle();
    if (tripError || !trip) {
      throw new ApiError(404, "TRIP_NOT_FOUND", "The authorized trip was not found.");
    }
    if (trip.bus_id !== payload.busId) {
      throw new ApiError(400, "BUS_MISMATCH", "The bus does not belong to this trip.");
    }
    if (trip.status !== "active" || !trip.sharing_enabled) {
      throw new ApiError(
        409,
        "SHARING_DISABLED",
        "Location updates are accepted only during an active trip with sharing enabled.",
      );
    }

    const { data: bus, error: busError } = await client
      .from("buses")
      .select("id,driver_id,assigned_route_id")
      .eq("id", payload.busId)
      .maybeSingle();
    if (busError || !bus) {
      throw new ApiError(404, "BUS_NOT_FOUND", "The bus does not exist.");
    }
    if (
      auth.profile.role === "driver" &&
      (bus.driver_id !== auth.user.id || trip.driver_id !== auth.user.id)
    ) {
      throw new ApiError(
        403,
        "NOT_ASSIGNED",
        "This driver account is not assigned to the bus and trip.",
      );
    }
    if (!bus.assigned_route_id || bus.assigned_route_id !== trip.route_id) {
      throw new ApiError(409, "ROUTE_MISMATCH", "The bus and trip route assignments do not match.");
    }

    const { data: route, error: routeError } = await client
      .from("routes")
      .select("id,shape,geometry_source")
      .eq("id", trip.route_id)
      .maybeSingle();
    if (routeError || !route) {
      throw new ApiError(404, "ROUTE_NOT_FOUND", "The configured route was not found.");
    }
    // Inferred catalogue/OSRM geometry is for simulation only. An operator must
    // verify and store a route corridor before accepting real driver positions.
    if (route.geometry_source !== "verified") {
      throw new ApiError(409, "ROUTE_NOT_VERIFIED", "This route needs a verified GPS corridor before live location sharing can be used.");
    }
    const shape = Array.isArray(route.shape) ? (route.shape as Coordinates[]) : [];
    const gps = validateGpsPoint(payload.latitude, payload.longitude, shape);
    if (!gps.valid) {
      throw new ApiError(422, "OFF_ROUTE", gps.error ?? "The location is outside the route corridor.");
    }

    // The RPC locks the trip until the insert commits and rechecks sharing,
    // role, assignment and the exact route shape validated above. Pause/end
    // updates use the same row lock, so they cannot be bypassed by a stale read.
    const { data: inserted, error: insertError } = await client
      .rpc("insert_guarded_bus_location", {
        p_trip_id: trip.id,
        p_bus_id: payload.busId,
        p_actor_id: auth.user.id,
        p_expected_route_id: trip.route_id,
        p_expected_shape: shape,
        p_latitude: payload.latitude,
        p_longitude: payload.longitude,
        p_heading: payload.heading ?? null,
        p_speed_kmh: payload.speedKmh ?? null,
        p_accuracy_meters: payload.accuracyMeters ?? null,
        p_recorded_at: payload.recordedAt,
      })
      .single();
    if (insertError || !inserted) {
      const known = insertError?.code === "P0001" ? GUARDED_WRITE_ERRORS[insertError.message] : undefined;
      if (known && insertError) throw new ApiError(known.status, insertError.message, known.message);
      throw new ApiError(500, "LOCATION_WRITE_FAILED", "The validated location could not be stored.");
    }

    return NextResponse.json(
      {
        ok: true,
        mode: "gps",
        maxAgeSeconds: MAX_LOCATION_AGE_SECONDS,
        offRouteMeters: Math.round(gps.offRouteMeters ?? 0),
        location: publicLocation(inserted as LocationRow),
      },
      { status: 201 },
    );
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request);
    const busId = new URL(request.url).searchParams.get("busId");
    if (!busId || busId.length > 120) {
      throw new ApiError(400, "INVALID_BUS_ID", "A valid busId query parameter is required.");
    }
    const client = auth.client ?? createAdminClient();
    const { data: row, error } = await client
      .from("bus_locations")
      .select(LOCATION_FIELDS)
      .eq("bus_id", busId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new ApiError(500, "LOCATION_READ_FAILED", "The latest location could not be read.");
    }
    if (!row) return NextResponse.json({ location: null }, { headers: { "Cache-Control": "no-store" } });

    const location = row as LocationRow;
    const { data: trip } = await client
      .from("trips")
      .select("id,status,sharing_enabled,ended_at")
      .eq("id", location.trip_id ?? "")
      .maybeSingle();
    const now = Date.now();
    const locationAge = now - new Date(location.recorded_at).getTime();
    const endedAge = trip?.ended_at ? now - new Date(trip.ended_at).getTime() : Infinity;
    const recentlyRecorded = Number.isFinite(locationAge) && locationAge >= -15_000 && locationAge < 15 * 60 * 1000;
    const recentlyCompleted = trip?.status === "completed" && endedAge >= 0 && endedAge < 15 * 60 * 1000;
    const allowed = auth.profile.role === "admin" ||
      (recentlyRecorded && (trip?.status === "active" || recentlyCompleted));
    // The service-role client bypasses RLS. Enforce the same 15-minute
    // visibility limit explicitly rather than returning an old bus position.
    if (!allowed) {
      return NextResponse.json({ location: null, live: false }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(
      { location: publicLocation(location), live: trip?.status === "active" && Boolean(trip.sharing_enabled) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
