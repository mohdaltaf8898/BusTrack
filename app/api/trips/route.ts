import { NextResponse } from "next/server";
import { firstZodError, tripActionSchema } from "@/lib/validation";
import {
  ApiError,
  apiErrorResponse,
  requireApiUser,
} from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface TripRow {
  id: string;
  bus_id: string;
  route_id: string;
  driver_id: string | null;
  status: string;
  sharing_enabled: boolean;
  started_at: string;
  ended_at: string | null;
  last_location_at: string | null;
}

function assertDriverAuthorization(
  role: string,
  userId: string,
  tripDriverId: string | null,
) {
  if (role === "driver" && tripDriverId !== userId) {
    throw new ApiError(403, "NOT_ASSIGNED", "This trip belongs to a different driver.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request, ["driver", "admin"]);
    if (!rateLimit(`trip:${auth.user.id}`, 30, 60_000)) {
      throw new ApiError(429, "RATE_LIMITED", "Too many trip actions. Please wait a moment.");
    }
    const raw = await request.json().catch(() => ({}));
    const parsed = tripActionSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, "INVALID_TRIP_ACTION", firstZodError(parsed.error));
    }
    const payload = parsed.data;
    const client = auth.client;
    const now = new Date().toISOString();

    if (payload.action === "start") {
      const { data: bus, error: busError } = await client
        .from("buses")
        .select("id,bus_number,assigned_route_id,driver_id,status")
        .eq("id", payload.busId)
        .maybeSingle();
      if (busError || !bus) {
        throw new ApiError(404, "BUS_NOT_FOUND", "The assigned bus was not found.");
      }
      if (bus.assigned_route_id !== payload.routeId) {
        throw new ApiError(400, "ROUTE_MISMATCH", "The bus is not assigned to this route.");
      }
      if (bus.status === "maintenance") {
        throw new ApiError(409, "BUS_UNAVAILABLE", "This bus is under maintenance.");
      }
      if (!bus.driver_id) {
        throw new ApiError(409, "DRIVER_UNASSIGNED", "Assign a driver before starting a trip.");
      }
      if (auth.profile.role === "driver" && bus.driver_id !== auth.user.id) {
        throw new ApiError(403, "NOT_ASSIGNED", "This driver is not assigned to this bus.");
      }

      await client
        .from("trips")
        .update({ status: "completed", ended_at: now, sharing_enabled: false })
        .eq("bus_id", bus.id)
        .eq("status", "active");

      const { data: trip, error: tripError } = await client
        .from("trips")
        .insert({
          bus_id: bus.id,
          route_id: bus.assigned_route_id,
          driver_id: bus.driver_id,
          status: "active",
          sharing_enabled: false,
          started_at: now,
          created_by: auth.user.id,
        })
        .select("id,bus_id,route_id,driver_id,status,sharing_enabled,started_at,ended_at,last_location_at")
        .single();
      if (tripError || !trip) {
        throw new ApiError(500, "TRIP_START_FAILED", "The authorized trip could not be created.");
      }
      return NextResponse.json(
        {
          ok: true,
          message: "Trip started. Location sharing is still OFF until explicitly enabled.",
          tripId: trip.id,
          trip: trip as TripRow,
        },
        { status: 201 },
      );
    }

    const { data: trip, error: tripError } = await client
      .from("trips")
      .select("id,bus_id,route_id,driver_id,status,sharing_enabled,started_at,ended_at,last_location_at")
      .eq("id", payload.tripId)
      .maybeSingle();
    if (tripError || !trip) {
      throw new ApiError(404, "TRIP_NOT_FOUND", "The trip was not found.");
    }
    assertDriverAuthorization(auth.profile.role, auth.user.id, trip.driver_id);

    if (payload.action === "end") {
      if (trip.status !== "active") {
        throw new ApiError(409, "TRIP_NOT_ACTIVE", "Only an active trip can be ended.");
      }
      const { data: updated, error } = await client
        .from("trips")
        .update({
          status: "completed",
          ended_at: now,
          sharing_enabled: false,
        })
        .eq("id", trip.id)
        .select("id,bus_id,route_id,driver_id,status,sharing_enabled,started_at,ended_at,last_location_at")
        .single();
      if (error || !updated) {
        throw new ApiError(500, "TRIP_END_FAILED", "The trip could not be ended.");
      }
      return NextResponse.json({
        ok: true,
        message: "Trip ended. GPS updates are no longer accepted.",
        tripId: updated.id,
        trip: updated as TripRow,
      });
    }

    if (trip.status !== "active") {
      throw new ApiError(
        409,
        "TRIP_NOT_ACTIVE",
        "Location sharing can change only during an active trip.",
      );
    }
    const { data: updated, error } = await client
      .from("trips")
      .update({ sharing_enabled: payload.enabled })
      .eq("id", trip.id)
      .select("id,bus_id,route_id,driver_id,status,sharing_enabled,started_at,ended_at,last_location_at")
      .single();
    if (error || !updated) {
      throw new ApiError(500, "SHARING_UPDATE_FAILED", "Location sharing could not be updated.");
    }
    return NextResponse.json({
      ok: true,
      message: payload.enabled
        ? "Sharing enabled. The driver device may now send authorized GPS updates."
        : "Sharing disabled. The last known position remains available to students.",
      tripId: updated.id,
      trip: updated as TripRow,
    });
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["driver", "admin"]);
    const client = auth.client;
    let query = client
      .from("trips")
      .select("id,bus_id,route_id,driver_id,status,sharing_enabled,started_at,ended_at,last_location_at")
      .order("started_at", { ascending: false })
      .limit(30);
    if (auth.profile.role === "driver") {
      query = query.eq("driver_id", auth.user.id);
    }
    const { data, error } = await query;
    if (error) {
      throw new ApiError(500, "TRIP_READ_FAILED", "Trips could not be loaded.");
    }
    return NextResponse.json(
      { trips: (data ?? []) as TripRow[] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
