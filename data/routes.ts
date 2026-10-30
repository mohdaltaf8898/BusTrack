import timetable from "@/data/lords-routes-2025-26.json";
import { buildRoute, type RouteSeed } from "@/lib/route-builder";
import type { AppUser, Bus, Coordinates, DemoDriver } from "@/lib/types";

/** Approximate campus centroid; pickup positions must be verified by transport staff. */
export const COLLEGE_COORDINATES: Coordinates = { lat: 17.3418, lng: 78.368 };
export const COLLEGE_NAME = "Lords Institute of Engineering and Technology";
export const TIMETABLE_SOURCE_URL = "https://www.scribd.com/document/910336742/BUS-Routes-25-26";
export const TIMETABLE_YEAR = "2025–26";

const colors = ["#2563eb", "#0f766e", "#7c3aed", "#d97706", "#db2777", "#0891b2"];

function minutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const difference = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  return difference > 0 ? difference : null;
}

/**
 * Stop names, sequence and AM times are transcribed from the user-supplied
 * 2025–26 document. They are historical, not a verified current timetable.
 * Nearby public transit/OSM points are approximate; unknown coordinates stay
 * null rather than being invented. A road router can improve the preview, but
 * neither that route nor a simulated bus is an official GPS trace.
 */
const routeSeeds: RouteSeed[] = timetable.map((entry, routeIndex) => {
  const first = entry.stops[0];
  const last = entry.stops[entry.stops.length - 1];
  const id = String(entry.number).padStart(2, "0");
  const scheduledDurationMinutes = minutesBetween(first.scheduledTime, last.scheduledTime);
  return {
    id: `route-${id}`,
    code: `Route ${id}`,
    name: `${first.name} → Lords College`,
    busNumber: `SIM-${id}`,
    startLocation: first.name,
    destination: "Lords College",
    description: "Morning pickup order from the 2025–26 college route document. Confirm current service with the transport office.",
    color: colors[routeIndex % colors.length],
    averageSpeedKmh: 25,
    estimatedDurationMinutes: scheduledDurationMinutes ?? 45,
    scheduledDurationMinutes,
    scheduleYear: TIMETABLE_YEAR,
    geometrySource: "straight",
    status: routeIndex < 2 ? "active" : "scheduled",
    stops: entry.stops.map((stop, index) => ({
      id: `r${id}-s${String(index + 1).padStart(2, "0")}`,
      name: stop.name,
      coordinates: stop.location ? { lat: stop.location.lat, lng: stop.location.lng } : null,
      scheduledTime: stop.scheduledTime,
      locationSource: stop.location?.source ?? null,
      locationReference: stop.location?.reference ?? null,
      note: "note" in stop && typeof stop.note === "string" ? stop.note : null,
    })),
    legs: Array.from({ length: entry.stops.length - 1 }, () => []),
  };
});

export const sampleRoutes = routeSeeds.map(buildRoute);

/** Vehicle IDs, assignments and driver identities are simulation-only. */
export const sampleBuses: Bus[] = sampleRoutes.map((route, index) => ({
  id: `bus-sim${String(index + 1).padStart(2, "0")}`,
  number: route.busNumber,
  routeId: route.id,
  driverId: index < 2 ? `driver-demo-${index + 1}` : null,
  capacity: null,
  status: route.status,
  model: "Simulation vehicle",
  serviceAvailability: "2025–26 pickup times; current service not verified",
}));

export const sampleDrivers: DemoDriver[] = [
  {
    id: "driver-demo-1",
    name: "Demo driver",
    email: "driver@example.edu",
    phone: "+91 XXXXX XXXXX (placeholder)",
    shift: "Simulation",
  },
  {
    id: "driver-demo-2",
    name: "Demo driver 2",
    email: "driver2@example.edu",
    phone: "+91 XXXXX XXXXX (placeholder)",
    shift: "Simulation",
  },
];

export const demoUsers: Record<Exclude<AppUser["role"], "admin"> | "admin", AppUser> = {
  student: {
    id: "demo-student-1",
    name: "Student",
    email: "student@bustrack.demo",
    role: "student",
    avatarInitials: "ST",
    assignedRouteId: "route-01",
    provider: "demo",
  },
  driver: {
    id: "demo-driver-1",
    name: "Demo driver",
    email: "driver@example.edu",
    role: "driver",
    avatarInitials: "DD",
    assignedBusId: "bus-sim01",
    assignedRouteId: "route-01",
    provider: "demo",
  },
  admin: {
    id: "demo-admin-1",
    name: "Transport Admin",
    email: "admin@bustrack.demo",
    role: "admin",
    avatarInitials: "TA",
    provider: "demo",
  },
};

export const transportOffice = {
  name: "College Transport Office",
  email: "transport.office@example.edu",
  phone: "+91 XXXXX XXXXX (placeholder)",
  hours: "Contact hours not verified",
  address: `${COLLEGE_NAME}, Hyderabad`,
};
