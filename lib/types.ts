export type UserRole = "student" | "driver" | "admin";
export type RouteStatus = "active" | "scheduled" | "maintenance";
export type TripStatus = "idle" | "active" | "completed" | "offline";
export type BusStatus = "on-time" | "delayed" | "arriving" | "offline";
export type ArrivalStatus =
  | "departed"
  | "arriving"
  | "approaching"
  | "upcoming"
  | "completed";
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
  lat: number;
  lng: number;
  order: number;
  landmark?: string;
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
  /** Ordered polyline. Each stop coordinate is included at stopIndices. */
  shape: Coordinates[];
  stopIndices: number[];
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
  capacity: number;
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
  /** Cumulative metres at each stop. */
  stopDistances: number[];
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
  etaSeconds: number;
  etaAt: number;
  distanceMeters: number;
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
