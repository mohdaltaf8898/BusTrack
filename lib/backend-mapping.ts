import { sampleBuses, sampleDrivers, sampleRoutes } from "@/data/routes";
import type {
  Bus,
  Coordinates,
  DelayReport,
  DemoDriver,
  Route,
  RouteStatus,
  TripRecord,
} from "@/lib/types";

export interface BackendRouteRow {
  id: string;
  code: string;
  route_name: string;
  start_location: string;
  destination: string;
  bus_number?: string | null;
  description?: string | null;
  average_speed_kmh?: number | null;
  estimated_duration_minutes?: number | null;
  status?: RouteStatus | null;
  color?: string | null;
  shape?: Coordinates[] | null;
  stop_indices?: number[] | null;
  geometry_source?: Route["geometrySource"] | null;
  schedule_year?: string | null;
  scheduled_duration_minutes?: number | null;
}

export interface BackendStopRow {
  id: string;
  route_id: string;
  stop_name: string;
  latitude: number | null;
  longitude: number | null;
  stop_order: number;
  scheduled_time?: string | null;
  location_source?: string | null;
  location_reference?: string | null;
  note?: string | null;
}

export interface BackendBusRow {
  id: string;
  bus_number: string;
  assigned_route_id: string;
  driver_id?: string | null;
  capacity?: number | null;
  status?: RouteStatus | null;
  model?: string | null;
  service_availability?: string | null;
}

export interface BackendDriverRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  shift?: string | null;
}

export interface BackendDelayRow {
  id: string;
  bus_id: string;
  route_id: string;
  delay_seconds: number;
  reason: string;
  created_at: string;
}

export interface BackendTripRow {
  id: string;
  bus_id: string;
  route_id: string;
  driver_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  sharing_enabled: boolean;
  last_location_at?: string | null;
}

export interface BackendData {
  routes?: BackendRouteRow[];
  stops?: BackendStopRow[];
  buses?: BackendBusRow[];
  drivers?: BackendDriverRow[];
  trips?: BackendTripRow[];
  delayReports?: BackendDelayRow[];
  health?: Array<Record<string, unknown>>;
}

function normalizeStatus(value: string | null | undefined): RouteStatus {
  return value === "active" || value === "scheduled" || value === "maintenance"
    ? value
    : "scheduled";
}

function nearestShapeIndex(point: Coordinates, shape: Coordinates[]): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  shape.forEach((candidate, index) => {
    const distance = (candidate.lat - point.lat) ** 2 + (candidate.lng - point.lng) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function mapBackendData(data: BackendData, now: number) {
  const routes: Route[] = (data.routes ?? []).flatMap((row) => {
    const stops = (data.stops ?? [])
      .filter((stop) => stop.route_id === row.id)
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((stop) => ({
        id: stop.id,
        name: stop.stop_name,
        lat: stop.latitude == null || stop.longitude == null ? null : Number(stop.latitude),
        lng: stop.latitude == null || stop.longitude == null ? null : Number(stop.longitude),
        order: stop.stop_order,
        scheduledTime: stop.scheduled_time?.slice(0, 5) ?? null,
        locationSource: stop.location_source ?? null,
        locationReference: stop.location_reference ?? null,
        note: stop.note ?? null,
      }));
    if (stops.length < 2 || !Array.isArray(row.shape) || row.shape.length < 2) return [];

    const shape = row.shape;
    if (!shape.every((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))) return [];

    const stopIndices = stops.map((stop, index) => {
      if (stop.lat == null || stop.lng == null) return -1;
      const suppliedIndex = row.stop_indices?.[index];
      return typeof suppliedIndex === "number" && Number.isInteger(suppliedIndex) && suppliedIndex >= 0 && suppliedIndex < shape.length
        ? suppliedIndex
        : nearestShapeIndex({ lat: stop.lat, lng: stop.lng }, shape);
    });

    return [
      {
        id: row.id,
        code: row.code,
        name: row.route_name,
        busNumber: row.bus_number ?? "Unassigned",
        startLocation: row.start_location,
        destination: row.destination,
        description: row.description ?? "Route stored in Supabase.",
        stops,
        shape,
        stopIndices,
        geometrySource: row.geometry_source === "verified" || row.geometry_source === "road" ? row.geometry_source : "straight",
        scheduleYear: row.schedule_year ?? null,
        scheduledDurationMinutes: row.scheduled_duration_minutes ?? null,
        color: row.color ?? "#2563eb",
        averageSpeedKmh: row.average_speed_kmh ?? 26,
        estimatedDurationMinutes: row.estimated_duration_minutes ?? 45,
        status: normalizeStatus(row.status),
      },
    ];
  });

  const buses: Bus[] = (data.buses ?? []).map((row) => ({
    id: row.id,
    number: row.bus_number,
    routeId: row.assigned_route_id,
    driverId: row.driver_id ?? null,
    capacity: row.capacity ?? null,
    status: normalizeStatus(row.status),
    model: row.model ?? "College coach",
    serviceAvailability:
      row.service_availability ?? "Service availability to be configured",
  }));

  const drivers: DemoDriver[] = (data.drivers ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? "driver@example.edu",
    phone: row.phone ?? "+91 XXXXX XXXXX (placeholder)",
    shift: row.shift ?? "Shift to be configured",
  }));

  const delayReports: DelayReport[] = (data.delayReports ?? []).map((row) => ({
    id: row.id,
    routeId: row.route_id,
    busId: row.bus_id,
    delaySeconds: row.delay_seconds,
    reason: row.reason,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : now,
    simulated: false,
  }));

  const trips: TripRecord[] = (data.trips ?? []).map((row) => ({
    id: row.id,
    busId: row.bus_id,
    routeId: row.route_id,
    driverId: row.driver_id,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : now,
    endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
    status: row.status,
    sharingEnabled: Boolean(row.sharing_enabled),
    lastLocationAt: row.last_location_at ? new Date(row.last_location_at).getTime() : null,
  }));

  return {
    routes: routes.length > 0 ? routes : sampleRoutes,
    buses: buses.length > 0 ? buses : sampleBuses,
    drivers: drivers.length > 0 ? drivers : sampleDrivers,
    delayReports,
    trips,
    health: data.health ?? [],
  };
}
