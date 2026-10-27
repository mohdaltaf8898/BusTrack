import { buildRoute, type RouteSeed } from "@/lib/route-builder";
import type { Bus, Coordinates, DemoDriver, AppUser } from "@/lib/types";

/**
 * Approximate coordinates around Hyderabad are used ONLY as prototype geometry.
 * These are not official college routes, timetables or GPS traces. Each stop is
 * a vertex of the polyline; the bus simulation never leaves that polyline.
 */
export const COLLEGE_COORDINATES: Coordinates = {
  lat: 17.3418,
  lng: 78.368,
};

export const COLLEGE_NAME = "Lords Institute of Engineering and Technology";

const routeSeeds: RouteSeed[] = [
  {
    id: "route-a",
    code: "R-A",
    name: "Gandipet → Mehdipatnam",
    busNumber: "BT-01",
    startLocation: "LIET Main Gate, Gandipet",
    destination: "Mehdipatnam Bus Stand",
    description:
      "Western campus connector via TSPA, Narsingi, Shaikpet and Tolichowki.",
    color: "#2563eb",
    averageSpeedKmh: 26,
    estimatedDurationMinutes: 42,
    status: "active",
    stops: [
      {
        id: "a-1",
        name: "LIET Main Gate",
        coordinates: { lat: 17.3418, lng: 78.368 },
        landmark: "College campus",
      },
      {
        id: "a-2",
        name: "TSPA Junction",
        coordinates: { lat: 17.3553, lng: 78.3692 },
        landmark: "Police Academy junction",
      },
      {
        id: "a-3",
        name: "Narsingi X Roads",
        coordinates: { lat: 17.3876, lng: 78.357 },
        landmark: "Narsingi",
      },
      {
        id: "a-4",
        name: "Shaikpet",
        coordinates: { lat: 17.4016, lng: 78.3985 },
        landmark: "Shaikpet junction",
      },
      {
        id: "a-5",
        name: "Tolichowki",
        coordinates: { lat: 17.4138, lng: 78.4317 },
        landmark: "Tolichowki",
      },
      {
        id: "a-6",
        name: "Mehdipatnam Bus Stand",
        coordinates: { lat: 17.3959, lng: 78.4312 },
        landmark: "Mehdipatnam",
      },
    ],
    legs: [
      [{ lat: 17.3468, lng: 78.3684 }, { lat: 17.3512, lng: 78.369 }],
      [
        { lat: 17.3648, lng: 78.3648 },
        { lat: 17.3748, lng: 78.3599 },
        { lat: 17.3825, lng: 78.3578 },
      ],
      [
        { lat: 17.389, lng: 78.363 },
        { lat: 17.3965, lng: 78.3752 },
        { lat: 17.4041, lng: 78.3886 },
      ],
      [
        { lat: 17.4072, lng: 78.4128 },
        { lat: 17.4126, lng: 78.427 },
      ],
      [{ lat: 17.405, lng: 78.4332 }, { lat: 17.3998, lng: 78.4322 }],
    ],
  },
  {
    id: "route-b",
    code: "R-B",
    name: "Gachibowli → Kukatpally",
    busNumber: "BT-02",
    startLocation: "LIET Main Gate, Gandipet",
    destination: "KPHB Colony",
    description:
      "North-west corridor via Gachibowli, HITEC City and Kukatpally Y Junction.",
    color: "#0f766e",
    averageSpeedKmh: 28,
    estimatedDurationMinutes: 55,
    status: "active",
    stops: [
      {
        id: "b-1",
        name: "LIET Main Gate",
        coordinates: { lat: 17.3418, lng: 78.368 },
        landmark: "College campus",
      },
      {
        id: "b-2",
        name: "Himayat Sagar Junction",
        coordinates: { lat: 17.362, lng: 78.3668 },
        landmark: "Himayat Sagar Road",
      },
      {
        id: "b-3",
        name: "Gachibowli X Roads",
        coordinates: { lat: 17.4372, lng: 78.3444 },
        landmark: "Gachibowli",
      },
      {
        id: "b-4",
        name: "HITEC City",
        coordinates: { lat: 17.4435, lng: 78.3772 },
        landmark: "Cyber Towers",
      },
      {
        id: "b-5",
        name: "Kukatpally Y Junction",
        coordinates: { lat: 17.483, lng: 78.417 },
        landmark: "Kukatpally",
      },
      {
        id: "b-6",
        name: "KPHB Colony",
        coordinates: { lat: 17.487, lng: 78.398 },
        landmark: "KPHB",
      },
    ],
    legs: [
      [{ lat: 17.3515, lng: 78.3675 }],
      [
        { lat: 17.373, lng: 78.3542 },
        { lat: 17.393, lng: 78.3475 },
        { lat: 17.4162, lng: 78.344 },
      ],
      [
        { lat: 17.442, lng: 78.3558 },
        { lat: 17.4458, lng: 78.3695 },
      ],
      [
        { lat: 17.466, lng: 78.3875 },
        { lat: 17.4762, lng: 78.4028 },
      ],
      [{ lat: 17.4892, lng: 78.4082 }],
    ],
  },
  {
    id: "route-c",
    code: "R-C",
    name: "Appa Junction → LB Nagar",
    busNumber: "BT-03",
    startLocation: "LIET Main Gate, Gandipet",
    destination: "LB Nagar Metro",
    description:
      "South-east corridor via Aramgarh, Bairamalguda and Dilsukhnagar.",
    color: "#7c3aed",
    averageSpeedKmh: 30,
    estimatedDurationMinutes: 48,
    status: "scheduled",
    stops: [
      {
        id: "c-1",
        name: "LIET Main Gate",
        coordinates: { lat: 17.3418, lng: 78.368 },
        landmark: "College campus",
      },
      {
        id: "c-2",
        name: "Appa Junction",
        coordinates: { lat: 17.3325, lng: 78.3758 },
        landmark: "Appa Junction",
      },
      {
        id: "c-3",
        name: "Aramgarh X Roads",
        coordinates: { lat: 17.3395, lng: 78.4516 },
        landmark: "PVNR Expressway",
      },
      {
        id: "c-4",
        name: "Chandrayangutta",
        coordinates: { lat: 17.339, lng: 78.481 },
        landmark: "Chandrayangutta",
      },
      {
        id: "c-5",
        name: "Bairamalguda",
        coordinates: { lat: 17.3418, lng: 78.4927 },
        landmark: "Bairamalguda",
      },
      {
        id: "c-6",
        name: "Dilsukhnagar",
        coordinates: { lat: 17.3688, lng: 78.5247 },
        landmark: "Dilsukhnagar",
      },
      {
        id: "c-7",
        name: "LB Nagar Metro",
        coordinates: { lat: 17.3484, lng: 78.551 },
        landmark: "LB Nagar",
      },
    ],
    legs: [
      [
        { lat: 17.337, lng: 78.3702 },
        { lat: 17.334, lng: 78.3728 },
      ],
      [
        { lat: 17.3298, lng: 78.396 },
        { lat: 17.3326, lng: 78.421 },
        { lat: 17.3372, lng: 78.4435 },
      ],
      [
        { lat: 17.3412, lng: 78.4615 },
        { lat: 17.3402, lng: 78.4725 },
      ],
      [{ lat: 17.3416, lng: 78.4865 }],
      [
        { lat: 17.3505, lng: 78.504 },
        { lat: 17.3612, lng: 78.5168 },
      ],
      [
        { lat: 17.3605, lng: 78.537 },
        { lat: 17.3528, lng: 78.545 },
      ],
    ],
  },
];

export const sampleRoutes = routeSeeds.map(buildRoute);

export const sampleBuses: Bus[] = [
  {
    id: "bus-bt01",
    number: "BT-01",
    routeId: "route-a",
    driverId: "driver-demo-1",
    capacity: 52,
    status: "active",
    model: "College coach · demo",
    serviceAvailability: "Weekdays · morning and afternoon trips (sample)",
  },
  {
    id: "bus-bt02",
    number: "BT-02",
    routeId: "route-b",
    driverId: "driver-demo-2",
    capacity: 48,
    status: "active",
    model: "College coach · demo",
    serviceAvailability: "Weekdays · morning and afternoon trips (sample)",
  },
  {
    id: "bus-bt03",
    number: "BT-03",
    routeId: "route-c",
    driverId: null,
    capacity: 45,
    status: "scheduled",
    model: "College coach · demo",
    serviceAvailability: "Awaiting driver assignment (sample)",
  },
];

export const sampleDrivers: DemoDriver[] = [
  {
    id: "driver-demo-1",
    name: "R. Kumar",
    email: "driver.bt01@example.edu",
    phone: "+91 XXXXX XXXXX (placeholder)",
    shift: "Morning · 7:00–10:00 (sample)",
  },
  {
    id: "driver-demo-2",
    name: "S. Rao",
    email: "driver.bt02@example.edu",
    phone: "+91 XXXXX XXXXX (placeholder)",
    shift: "Morning · 7:15–10:15 (sample)",
  },
];

export const demoUsers: Record<Exclude<AppUser["role"], "admin"> | "admin", AppUser> = {
  student: {
    id: "demo-student-1",
    name: "Aarav S.",
    email: "student@bustrack.demo",
    role: "student",
    avatarInitials: "AS",
    assignedRouteId: "route-a",
    provider: "demo",
  },
  driver: {
    id: "demo-driver-1",
    name: "R. Kumar",
    email: "driver.bt01@example.edu",
    role: "driver",
    avatarInitials: "RK",
    assignedBusId: "bus-bt01",
    assignedRouteId: "route-a",
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
  hours: "Mon–Sat · 8:00 AM–6:00 PM (sample hours)",
  address: `${COLLEGE_NAME}, Hyderabad`,
};
