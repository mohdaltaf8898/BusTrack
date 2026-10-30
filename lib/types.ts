export type UserRole = "student" | "driver" | "admin";
export type RouteStatus = "active" | "scheduled" | "maintenance";
export type TripStatus = "idle" | "active" | "completed" | "offline";
export type BusStatus = "on-time" | "delayed" | "arriving" | "offline";
export type ArrivalStatus =
  | "departed"
  | "arriving"
  | "approaching"
  | "upcoming"
  | "completed"
  | "unmapped";
export type NotificationType =
  | "delay"
  | "approaching"
  | "arrival"
  | "trip_started"
  | "trip_completed"
  | "location_unavailable"
  | "system";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Stop {
  id: string;
  name: string;
  /** Null means the published stop has not been located reliably. */
  lat: number | null;
  lng: number | null;
  order: number;
  landmark?: string;
  /** AM time in the historical 2025–26 timetable, not a live ETA. */
  scheduledTime?: string | null;
  locationSource?: string | null;
  locationReference?: string | null;
  note?: string | null;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  busNumber: string;
  startLocation: string;
  destination: string;
  description: string;
  stops: Stop[];
  /** Polyline and matching indices; -1 means that a stop has no mapped location. */
  shape: Coordinates[];
  stopIndices: number[];
  geometrySource?: "straight" | "road" | "verified";
  scheduleYear?: string | null;
  scheduledDurationMinutes?: number | null;
  color: string;
  averageSpeedKmh: number;
  estimatedDurationMinutes: number;
  status: RouteStatus;
}

export interface Bus {
  id: string;
  number: string;
  routeId: string;
  driverId: string | null;
  capacity: number | null;
  status: RouteStatus;
  model: string;
  serviceAvailability: string;
}

export interface DemoDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  shift: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  assignedBusId?: string;
  assignedRouteId?: string;
  provider: "demo" | "supabase";
}

export interface RouteGeometry {
  points: Coordinates[];
  /** Cumulative metres at each shape point. */
  cumulative: number[];
  /** Cumulative metres at each mapped stop; null for an unmapped stop. */
  stopDistances: Array<number | null>;
  totalDistanceMeters: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface PointOnRoute extends Coordinates {
  bearing: number;
  segmentIndex: number;
  progress: number;
}

export interface TrafficCondition {
  label: "Light" | "Moderate" | "Heavy";
  factor: number;
  description: string;
}

export interface SimulationState {
  routeId: string;
  distanceMeters: number;
  isRunning: boolean;
  isSharing: boolean;
  tripStatus: TripStatus;
  delaySeconds: number;
  lastUpdateAt: number;
  startedAt: number | null;
  endedAt: number | null;
  lap: number;
  elapsedSeconds: number;
  announcedEventKeys: string[];
  source: "simulation";
}

export type SimulationEventType =
  | "trip_started"
  | "trip_completed"
  | "approaching"
  | "arrival"
  | "delay"
  | "location_unavailable";

export interface SimulationEvent {
  key: string;
  type: SimulationEventType;
  routeId: string;
  stopId?: string;
  stopName?: string;
  title: string;
  message: string;
  createdAt: number;
  delaySeconds?: number;
}

export interface StopEta {
  stop: Stop;
  etaSeconds: number | null;
  etaAt: number | null;
  distanceMeters: number | null;
  status: ArrivalStatus;
  isSelected: boolean;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: number;
  readAt: number | null;
  routeId?: string;
  busId?: string;
  simulated: boolean;
}

export interface DelayReport {
  id: string;
  routeId: string;
  busId: string;
  delaySeconds: number;
  reason: string;
  createdAt: number;
  simulated: boolean;
}

export interface TripRecord {
  id: string;
  busId: string;
  routeId: string;
  driverId: string | null;
  startedAt: number;
  endedAt: number | null;
  status: string;
  sharingEnabled: boolean;
  lastLocationAt: number | null;
}

export interface RemoteBusLocation {
  busId: string;
  routeId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedKmh: number | null;
  recordedAt: number;
  source: "gps" | "simulation";
  accuracyMeters?: number | null;
}

export type RealtimeStatus = "disabled" | "connecting" | "connected" | "error";

export interface AppState {
  hydrated: boolean;
  currentTime: number;
  user: AppUser | null;
  selectedRouteId: string;
  selectedStopId: string;
  routes: Route[];
  buses: Bus[];
  drivers: DemoDriver[];
  simulations: Record<string, SimulationState>;
  notifications: NotificationItem[];
  delayReports: DelayReport[];
  backendTrips: TripRecord[];
  /** Keyed by route ID; keeps the most recent device or demo location. */
  remoteLocations: Record<string, RemoteBusLocation>;
  handledEventKeys: string[];
  error: string | null;
  backendReady: boolean;
  backendMessage: string | null;
  realtimeStatus: RealtimeStatus;
  isOnline: boolean;
  authLoading: boolean;
}

export interface BackendConfig {
  enabled: boolean;
  demoMode: boolean;
  publicConfigured: boolean;
  serverConfigured: boolean;
  realtimeConfigured: boolean;
  simulationSpeedMultiplier: number;
  staleLocationSeconds: number;
}
