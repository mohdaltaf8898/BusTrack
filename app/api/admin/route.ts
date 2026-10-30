import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type {
  BackendBusRow,
  BackendDelayRow,
  BackendDriverRow,
  BackendRouteRow,
  BackendStopRow,
  BackendTripRow,
} from "@/lib/backend-mapping";
import type { Coordinates } from "@/lib/types";
import {
  adminMutationSchema,
  busInputSchema,
  delayReportSchema,
  driverAssignmentSchema,
  firstZodError,
  routeInputSchema,
  stopInputSchema,
} from "@/lib/validation";
import {
  ApiError,
  apiErrorResponse,
  createAdminClient,
  optionalApiUser,
  requireApiUser,
} from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", firstZodError(result.error));
  }
  return result.data;
}

function throwOnDbError(error: { message: string } | null, fallback: string) {
  if (error) {
    throw new ApiError(400, "DATABASE_ERROR", error.message || fallback);
  }
}

function asShape(value: unknown): Coordinates[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { lat?: unknown }).lat === "number" &&
      typeof (item as { lng?: unknown }).lng === "number"
    ) {
      const point = item as { lat: number; lng: number };
      return [{ lat: point.lat, lng: point.lng }];
    }
    return [];
  });
}

function asIndices(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

async function assertRouteExists(client: SupabaseClient, routeId: string) {
  const { data, error } = await client.from("routes").select("id").eq("id", routeId).maybeSingle();
  throwOnDbError(error, "Could not verify route.");
  if (!data) throw new ApiError(400, "ROUTE_NOT_FOUND", "The selected route does not exist.");
}

async function assertDriverProfile(client: SupabaseClient, driverId: string | null) {
  if (!driverId) return;
  const { data, error } = await client
    .from("profiles")
    .select("id,role")
    .eq("id", driverId)
    .maybeSingle();
  throwOnDbError(error, "Could not verify driver.");
  if (!data || data.role !== "driver") {
    throw new ApiError(400, "INVALID_DRIVER", "The selected profile is not an authorized driver.");
  }
}

/** Rebuilds a stop-to-stop shape after an authorized stop change. */
async function syncRouteGeometry(client: SupabaseClient, routeId: string) {
  const { data: stops, error } = await client
    .from("stops")
    .select("id,latitude,longitude,stop_order")
    .eq("route_id", routeId)
    .order("stop_order", { ascending: true });
  throwOnDbError(error, "Could not read route stops.");
  if (!stops || stops.length < 2) {
    throw new ApiError(400, "TOO_FEW_STOPS", "A route must keep at least two stops.");
  }
  const shape: Coordinates[] = [];
  const stopIndices = stops.map((stop) => {
    if (stop.latitude == null || stop.longitude == null) return -1;
    shape.push({ lat: Number(stop.latitude), lng: Number(stop.longitude) });
    return shape.length - 1;
  });
  if (shape.length < 2) {
    throw new ApiError(400, "TOO_FEW_MAPPED_STOPS", "A route needs at least two mapped stops.");
  }
  const { error: updateError } = await client
    .from("routes")
    .update({ shape, stop_indices: stopIndices, geometry_source: "straight" })
    .eq("id", routeId);
  throwOnDbError(updateError, "Could not synchronize route geometry.");
}

async function loadAdminData(request: Request) {
  const client = createAdminClient();
  const auth = await optionalApiUser(request);
  const [
    routesResult,
    stopsResult,
    busesResult,
    tripsResult,
    delaysResult,
    healthResult,
  ] = await Promise.all([
    client
      .from("routes")
      .select(
        "id,code,route_name,start_location,destination,bus_number,description,average_speed_kmh,estimated_duration_minutes,status,color,shape,stop_indices,geometry_source,schedule_year,scheduled_duration_minutes",
      )
      .order("code"),
    client
      .from("stops")
      .select("id,route_id,stop_name,latitude,longitude,stop_order,scheduled_time,location_source,location_reference,note")
      .order("stop_order"),
    client
      .from("buses")
      .select("id,bus_number,assigned_route_id,driver_id,capacity,status,model,service_availability")
      .order("bus_number"),
    auth
      ? client.from("trips")
          .select("id,bus_id,route_id,driver_id,started_at,ended_at,status,sharing_enabled,last_location_at")
          .order("started_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
    auth
      ? client.from("delay_reports")
          .select("id,bus_id,route_id,delay_seconds,reason,created_at")
          .order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
    auth?.profile.role === "admin"
      ? client.from("bus_location_health").select("*")
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwOnDbError(routesResult.error, "Could not read routes.");
  throwOnDbError(stopsResult.error, "Could not read stops.");
  throwOnDbError(busesResult.error, "Could not read buses.");
  throwOnDbError(tripsResult.error, "Could not read trips.");
  throwOnDbError(delaysResult.error, "Could not read delay reports.");

  const routes: BackendRouteRow[] = (routesResult.data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    route_name: row.route_name,
    start_location: row.start_location,
    destination: row.destination,
    bus_number: row.bus_number,
    description: row.description,
    average_speed_kmh: row.average_speed_kmh,
    estimated_duration_minutes: row.estimated_duration_minutes,
    status: row.status,
    color: row.color,
    shape: asShape(row.shape),
    stop_indices: asIndices(row.stop_indices),
    geometry_source: row.geometry_source,
    schedule_year: row.schedule_year,
    scheduled_duration_minutes: row.scheduled_duration_minutes,
  }));
  const stops = (stopsResult.data ?? []) as BackendStopRow[];
  const buses = (busesResult.data ?? []) as BackendBusRow[];
  const trips = (tripsResult.data ?? []) as BackendTripRow[];
  const delayReports = (delaysResult.data ?? []) as BackendDelayRow[];

  let drivers: BackendDriverRow[] = [];
  if (auth?.profile.role === "admin") {
    const { data: profiles } = await client
      .from("profiles")
      .select("id,name,role")
      .eq("role", "driver")
      .order("name");
    drivers = (profiles ?? []).map((profile) => ({
      id: profile.id,
      name: profile.name,
      email: null,
      phone: null,
      shift: null,
    }));
  }

  return {
    configured: true,
    demoMode: false,
    message:
      routes.length > 0
        ? "Supabase routes loaded. Simulated bus positions remain active until an authorized driver sends GPS."
        : "Supabase is configured but no routes were found. Apply the seed data or add routes as admin.",
    data: {
      routes,
      stops,
      buses,
      drivers,
      trips,
      delayReports,
      health: healthResult.error ? [] : (healthResult.data ?? []),
    },
  };
}

export async function GET(request: Request) {
  try {
    const data = await loadAdminData(request);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json({ ...body, demoMode: status === 503 }, { status });
  }
}

async function mutateBus(
  client: SupabaseClient,
  action: string,
  id: string | undefined,
  data: unknown,
) {
  if (action === "delete") {
    if (!id) throw new ApiError(400, "MISSING_ID", "A bus ID is required.");
    const { error } = await client.from("buses").delete().eq("id", id);
    throwOnDbError(error, "Could not delete bus.");
    return { id };
  }
  const input = parseInput(busInputSchema, data);
  await assertRouteExists(client, input.routeId);
  await assertDriverProfile(client, input.driverId);
  const busId = id ?? `bus-${randomUUID().slice(0, 8)}`;
  const row = {
    bus_number: input.number,
    assigned_route_id: input.routeId,
    driver_id: input.driverId,
    capacity: input.capacity,
    status: input.status,
    model: input.model,
    service_availability: input.serviceAvailability,
  };
  const query = action === "create"
    ? client.from("buses").insert({ id: busId, ...row })
    : client.from("buses").update(row).eq("id", busId);
  const { error } = await query;
  if (error?.code === "23505") {
    throw new ApiError(409, "DUPLICATE_BUS", "A bus with this number already exists.");
  }
  throwOnDbError(error, "Could not save bus.");
  return { id: busId };
}

async function mutateRoute(
  client: SupabaseClient,
  action: string,
  id: string | undefined,
  data: unknown,
) {
  if (action === "delete") {
    if (!id) throw new ApiError(400, "MISSING_ID", "A route ID is required.");
    const { data: assignedBuses, error: busError } = await client
      .from("buses")
      .select("id")
      .eq("assigned_route_id", id)
      .limit(1);
    throwOnDbError(busError, "Could not check route assignments.");
    if (assignedBuses && assignedBuses.length > 0) {
      throw new ApiError(
        409,
        "ROUTE_IN_USE",
        "Reassign or delete buses on this route before deleting it.",
      );
    }
    const { error } = await client.from("routes").delete().eq("id", id);
    throwOnDbError(error, "Could not delete route.");
    return { id };
  }

  const raw = (data ?? {}) as Record<string, unknown>;
  const { templateRouteId, ...routeFields } = raw;
  const input = parseInput(routeInputSchema, routeFields);
  const routeId = id ?? `route-${randomUUID().slice(0, 8)}`;
  const row = {
    code: input.code,
    route_name: input.name,
    start_location: input.startLocation,
    destination: input.destination,
    bus_number: input.busNumber,
    description: input.description,
    average_speed_kmh: input.averageSpeedKmh,
    estimated_duration_minutes: input.estimatedDurationMinutes,
    status: input.status,
  };

  if (action === "update") {
    const { error } = await client.from("routes").update(row).eq("id", routeId);
    throwOnDbError(error, "Could not update route.");
    return { id: routeId };
  }

  const templateId =
    typeof templateRouteId === "string" && templateRouteId
      ? templateRouteId
      : (await client.from("routes").select("id").order("code").limit(1).maybeSingle()).data?.id;
  if (!templateId) {
    throw new ApiError(400, "NO_TEMPLATE", "At least one existing route is required as a geometry template.");
  }
  const { data: template, error: templateError } = await client
    .from("routes")
    .select("shape,stop_indices,color")
    .eq("id", templateId)
    .maybeSingle();
  throwOnDbError(templateError, "Could not read route template.");
  if (!template) throw new ApiError(400, "TEMPLATE_NOT_FOUND", "The geometry template was not found.");

  const { error: insertError } = await client.from("routes").insert({
    id: routeId,
    ...row,
    color: "#2563eb",
    shape: asShape(template.shape),
    stop_indices: asIndices(template.stop_indices),
  });
  throwOnDbError(insertError, "Could not create route.");

  const { data: templateStops, error: stopsError } = await client
    .from("stops")
    .select("stop_name,latitude,longitude,stop_order")
    .eq("route_id", templateId)
    .order("stop_order");
  throwOnDbError(stopsError, "Could not copy template stops.");
  if (templateStops && templateStops.length >= 2) {
    const { error: copyError } = await client.from("stops").insert(
      templateStops.map((stop) => ({
        id: `stop-${randomUUID().slice(0, 8)}`,
        route_id: routeId,
        stop_name: stop.stop_name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        stop_order: stop.stop_order,
      })),
    );
    throwOnDbError(copyError, "Could not copy template stops.");
    await syncRouteGeometry(client, routeId);
  }
  return { id: routeId };
}

async function mutateStop(
  client: SupabaseClient,
  action: string,
  id: string | undefined,
  data: unknown,
) {
  const raw = (data ?? {}) as Record<string, unknown>;
  const routeId = typeof raw.routeId === "string" ? raw.routeId : "";
  if (!routeId) throw new ApiError(400, "MISSING_ROUTE", "A route ID is required for stop changes.");
  await assertRouteExists(client, routeId);

  if (action === "delete") {
    if (!id) throw new ApiError(400, "MISSING_ID", "A stop ID is required.");
    const { data: existing, error: countError } = await client
      .from("stops")
      .select("id,latitude,longitude")
      .eq("route_id", routeId);
    throwOnDbError(countError, "Could not count stops.");
    if (!existing || existing.length <= 2) {
      throw new ApiError(400, "TOO_FEW_STOPS", "A route must keep at least two stops.");
    }
    if (existing.filter((stop) => stop.id !== id && stop.latitude != null && stop.longitude != null).length < 2) {
      throw new ApiError(400, "TOO_FEW_MAPPED_STOPS", "A route needs at least two mapped stops.");
    }
    const { error } = await client.from("stops").delete().eq("id", id).eq("route_id", routeId);
    throwOnDbError(error, "Could not delete stop.");
    await syncRouteGeometry(client, routeId);
    return { id, routeId };
  }

  const input = parseInput(stopInputSchema, raw);
  const stopId = id ?? `stop-${randomUUID().slice(0, 8)}`;
  const row = {
    route_id: routeId,
    stop_name: input.name,
    latitude: input.lat,
    longitude: input.lng,
    stop_order: input.order,
    location_source: "Admin-entered; verification required",
    location_reference: null,
  };
  const query = action === "create"
    ? client.from("stops").insert({ id: stopId, ...row })
    : client.from("stops").update(row).eq("id", stopId).eq("route_id", routeId);
  const { error } = await query;
  throwOnDbError(error, "Could not save stop.");
  await syncRouteGeometry(client, routeId);
  return { id: stopId, routeId };
}

async function mutateDriverAssignment(
  client: SupabaseClient,
  data: unknown,
) {
  const input = parseInput(driverAssignmentSchema, data);
  await assertDriverProfile(client, input.driverId);
  const { error } = await client
    .from("buses")
    .update({ driver_id: input.driverId })
    .eq("id", input.busId);
  throwOnDbError(error, "Could not update driver assignment.");
  return { id: input.busId };
}

async function endTripsAsAdmin(client: SupabaseClient, data: unknown) {
  const raw = (data ?? {}) as Record<string, unknown>;
  let query = client
    .from("trips")
    .select("id")
    .eq("status", "active");
  if (typeof raw.busId === "string" && raw.busId) query = query.eq("bus_id", raw.busId);
  if (typeof raw.routeId === "string" && raw.routeId) query = query.eq("route_id", raw.routeId);
  const { data: trips, error } = await query;
  throwOnDbError(error, "Could not find active trips.");
  if (!trips || trips.length === 0) {
    return { ok: true, message: "No active backend trip needed to be ended." };
  }
  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from("trips")
    .update({ status: "completed", ended_at: now, sharing_enabled: false })
    .in("id", trips.map((trip) => trip.id));
  throwOnDbError(updateError, "Could not end active trips.");
  return { ok: true, message: `${trips.length} active trip(s) were ended.` };
}

async function createDelayReport(
  client: SupabaseClient,
  adminId: string,
  data: unknown,
) {
  const input = parseInput(delayReportSchema, data);
  await assertRouteExists(client, input.routeId);
  const now = new Date().toISOString();
  const reportId = randomUUID();
  const { error } = await client.from("delay_reports").insert({
    id: reportId,
    bus_id: input.busId,
    route_id: input.routeId,
    delay_seconds: input.delaySeconds,
    reason: input.reason,
    created_by: adminId,
    created_at: now,
  });
  throwOnDbError(error, "Could not create delay report.");
  await client.from("notifications").insert({
    user_id: null,
    bus_id: input.busId,
    route_id: input.routeId,
    title: "Bus delayed",
    message: `${input.reason} (${Math.round(input.delaySeconds / 60)} min estimated delay).`,
    type: "delay",
    is_simulated: false,
    created_at: now,
  });
  return { id: reportId };
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request, ["admin"]);
    if (!rateLimit(`admin:${auth.user.id}`, 90, 60_000)) {
      throw new ApiError(429, "RATE_LIMITED", "Too many admin operations. Please wait a moment.");
    }
    const raw = await request.json().catch(() => ({}));
    const mutation = parseInput(adminMutationSchema, raw);
    const client = auth.client;
    const { resource, action, id, data } = mutation;

    let result: Record<string, unknown>;
    switch (resource) {
      case "buses":
        result = await mutateBus(client, action, id, data);
        break;
      case "routes":
        result = await mutateRoute(client, action, id, data);
        break;
      case "stops":
        result = await mutateStop(client, action, id, data);
        break;
      case "driver-assignments":
        if (action !== "update") {
          throw new ApiError(400, "UNSUPPORTED_ACTION", "Driver assignments support update only.");
        }
        result = await mutateDriverAssignment(client, data);
        break;
      case "trips":
        if (action !== "end-trip") {
          throw new ApiError(400, "UNSUPPORTED_ACTION", "Trips support end-trip only from admin.");
        }
        result = await endTripsAsAdmin(client, data);
        break;
      case "delay-reports":
        if (action === "create") {
          result = await createDelayReport(client, auth.user.id, data);
        } else if (action === "delete") {
          if (!id) throw new ApiError(400, "MISSING_ID", "A delay report ID is required.");
          const { error } = await client.from("delay_reports").delete().eq("id", id);
          throwOnDbError(error, "Could not delete delay report.");
          result = { id };
        } else {
          throw new ApiError(400, "UNSUPPORTED_ACTION", "Delay reports support create and delete only.");
        }
        break;
      default:
        throw new ApiError(400, "UNSUPPORTED_RESOURCE", "The requested resource is not supported.");
    }

    return NextResponse.json({
      ok: true,
      message: typeof result.message === "string" ? result.message : "Authorized change saved.",
      ...result,
    });
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
