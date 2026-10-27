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
      .select("id,shape")
      .eq("id", trip.route_id)
      .maybeSingle();
    if (routeError || !route) {
      throw new ApiError(404, "ROUTE_NOT_FOUND", "The configured route was not found.");
    }
    const shape = Array.isArray(route.shape) ? (route.shape as Coordinates[]) : [];
    const gps = validateGpsPoint(payload.latitude, payload.longitude, shape);
    if (!gps.valid) {
      throw new ApiError(422, "OFF_ROUTE", gps.error ?? "The location is outside the route corridor.");
    }

    const { data: inserted, error: insertError } = await client
      .from("bus_locations")
      .insert({
        bus_id: payload.busId,
        route_id: trip.route_id,
        trip_id: trip.id,
        latitude: payload.latitude,
        longitude: payload.longitude,
        heading: payload.heading ?? null,
        speed_kmh: payload.speedKmh ?? null,
        accuracy_meters: payload.accuracyMeters ?? null,
        source: "gps",
        recorded_at: payload.recordedAt,
      })
      .select(LOCATION_FIELDS)
      .single();
    if (insertError || !inserted) {
      throw new ApiError(500, "LOCATION_WRITE_FAILED", "The validated location could not be stored.");
    }

    await client
      .from("trips")
      .update({ last_location_at: payload.recordedAt })
      .eq("id", trip.id);

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
    const recentlyCompleted =
      trip?.status === "completed" &&
      trip.ended_at &&
      Date.now() - new Date(trip.ended_at).getTime() < 15 * 60 * 1000;
    const allowed =
      auth.profile.role === "admin" ||
      trip?.status === "active" ||
      Boolean(recentlyCompleted);
    if (!allowed) {
      throw new ApiError(
        403,
        "PRIVATE_LOCATION",
        "No off-duty driver location is available for this bus.",
      );
    }
    return NextResponse.json(
      { location: publicLocation(location) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
