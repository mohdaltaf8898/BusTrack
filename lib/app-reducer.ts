import { sampleBuses, sampleDrivers, sampleRoutes, demoUsers } from "@/data/routes";
import { backendConfig, isSupabaseConfigured } from "@/lib/config";
import { buildRouteGeometry } from "@/lib/geo";
import { routeCoordinateKey, type RoadGeometry } from "@/lib/road-routing";
import { advanceSimulation, type SimulationUpdate } from "@/lib/simulation";
import type {
  AppState,
  Bus,
  DelayReport,
  DemoDriver,
  NotificationItem,
  NotificationType,
  RealtimeStatus,
  Route,
  TripRecord,
  SimulationEvent,
  SimulationState,
  AppUser,
} from "@/lib/types";
import type {
  BusInput,
  RouteInput,
  StopInput,
} from "@/lib/validation-types";
import { makeId } from "@/lib/utils";

// Keep the earlier demo catalog untouched in v1 while loading the 2025–26 routes.
export const APP_STORAGE_KEY = "bustrack:demo-state:v2";
const MAX_NOTIFICATIONS = 80;
const MAX_EVENT_KEYS = 400;

function initialNotifications(now: number): NotificationItem[] {
  return [
    {
      id: "welcome-demo",
      type: "system",
      title: "Welcome to BusTrack",
      message:
        "The stop lists come from the 2025–26 timetable. Bus positions, ETAs and alerts are simulated; confirm current service with the transport office.",
      createdAt: now - 1000 * 60 * 3,
      readAt: null,
      simulated: true,
    },
    {
      id: "route-01-trip-demo",
      type: "trip_started",
      title: "SIM-01 started its trip",
      message: "Route 01 is sharing a simulated position from Asif Nagar.",
      createdAt: now - 1000 * 60 * 2,
      readAt: now - 1000 * 60,
      routeId: "route-01",
      busId: "bus-sim01",
      simulated: true,
    },
    {
      id: "route-02-delay-demo",
      type: "delay",
      title: "Traffic update on Route 02",
      message: "A simulated 3-minute delay has been added to Route 02.",
      createdAt: now - 1000 * 60,
      readAt: null,
      routeId: "route-02",
      busId: "bus-sim02",
      simulated: true,
    },
  ];
}

function initialSimulations(now: number, routes: Route[]) {
  return Object.fromEntries(
    routes.map((route, index) => {
      let overrides: Partial<SimulationState> = {};
      if (index === 0) {
        overrides = {
          tripStatus: "active",
          isRunning: true,
          isSharing: true,
          startedAt: now - 20_000,
          elapsedSeconds: 20,
        };
      } else if (index === 1) {
        overrides = {
          tripStatus: "active",
          isRunning: true,
          isSharing: true,
          delaySeconds: 180,
          startedAt: now - 35_000,
          elapsedSeconds: 35,
        };
      }
      return [route.id, createLocalSimulationState(route.id, now, overrides)];
    }),
  );
}

function createLocalSimulationState(
  routeId: string,
  now: number,
  overrides: Partial<SimulationState> = {},
): SimulationState {
  return {
    routeId,
    distanceMeters: 0,
    isRunning: false,
    isSharing: false,
    tripStatus: "idle",
    delaySeconds: 0,
    lastUpdateAt: now,
    startedAt: null,
    endedAt: null,
    lap: 1,
    elapsedSeconds: 0,
    announcedEventKeys: [],
    source: "simulation",
    ...overrides,
  };
}

export function createInitialState(now: number): AppState {
  return {
    hydrated: false,
    currentTime: now,
    user: isSupabaseConfigured ? null : { ...demoUsers.student },
    selectedRouteId: sampleRoutes[0].id,
    selectedStopId: sampleRoutes[0].stops[2]?.id ?? sampleRoutes[0].stops[0].id,
    routes: sampleRoutes.map((route) => ({ ...route, stops: [...route.stops] })),
    buses: sampleBuses.map((bus) => ({ ...bus })),
    drivers: sampleDrivers.map((driver) => ({ ...driver })),
    simulations: initialSimulations(now, sampleRoutes),
    notifications: initialNotifications(now),
    backendTrips: [],
    delayReports: [
      {
        id: "delay-sample-02",
        routeId: "route-02",
        busId: "bus-sim02",
        delaySeconds: 180,
        reason: "Simulated Route 02 traffic",
        createdAt: now - 60_000,
        simulated: true,
      },
    ],
    remoteLocations: {},
    handledEventKeys: [],
    error: null,
    backendReady: !isSupabaseConfigured,
    backendMessage: isSupabaseConfigured
      ? "Supabase client configured. Sign in for role-based features; demo data remains available."
      : "No Supabase credentials found. Local simulation is active.",
    realtimeStatus: isSupabaseConfigured ? "connecting" : "disabled",
    isOnline: true,
    authLoading: isSupabaseConfigured,
  };
}

export interface PersistedAppState {
  version: 1;
  savedAt: number;
  user: AppUser | null;
  selectedRouteId: string;
  selectedStopId: string;
  routes: Route[];
  buses: Bus[];
  drivers: DemoDriver[];
  simulations: Record<string, SimulationState>;
  notifications: NotificationItem[];
  delayReports: DelayReport[];
  handledEventKeys: string[];
}

export function toPersistedState(state: AppState): PersistedAppState {
  return {
    version: 1,
    savedAt: state.currentTime,
    user: state.user?.provider === "demo" ? state.user : null,
    selectedRouteId: state.selectedRouteId,
    selectedStopId: state.selectedStopId,
    routes: state.routes,
    buses: state.buses,
    drivers: state.drivers,
    simulations: state.simulations,
    notifications: state.notifications,
    delayReports: state.delayReports,
    handledEventKeys: state.handledEventKeys.slice(-MAX_EVENT_KEYS),
  };
}

function isValidRoute(route: unknown): route is Route {
  if (!route || typeof route !== "object") return false;
  const candidate = route as Route;
  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.stops) &&
    candidate.stops.length >= 2 &&
    Array.isArray(candidate.shape) &&
    candidate.shape.length >= 2 &&
    Array.isArray(candidate.stopIndices)
  );
}

export function hydratePersistedState(stored: PersistedAppState, now: number): AppState {
  const fresh = createInitialState(now);
  const routes = Array.isArray(stored.routes) && stored.routes.every(isValidRoute) && stored.routes.length > 0
    ? stored.routes
    : fresh.routes;
  const selectedRoute =
    routes.find((route) => route.id === stored.selectedRouteId) ?? routes[0];
  const selectedStop =
    selectedRoute.stops.find((stop) => stop.id === stored.selectedStopId) ??
    selectedRoute.stops[Math.min(2, selectedRoute.stops.length - 1)];

  const simulations = Object.fromEntries(
    routes.map((route) => {
      const saved = stored.simulations?.[route.id];
      const freshSimulation = createLocalSimulationState(route.id, now);
      if (
        !saved ||
        typeof saved.lastUpdateAt !== "number" ||
        now - saved.lastUpdateAt > 1000 * 60 * 60 * 12
      ) {
        return [route.id, freshSimulation];
      }
      return [
        route.id,
        {
          ...freshSimulation,
          ...saved,
          // Never resume movement from a stale browser session as if it were live.
          isRunning: false,
          isSharing: false,
          tripStatus: saved.tripStatus === "active" ? "offline" : saved.tripStatus,
        },
      ];
    }),
  );

  return {
    ...fresh,
    hydrated: true,
    currentTime: now,
    user: stored.user?.provider === "demo" ? stored.user : fresh.user,
    selectedRouteId: selectedRoute.id,
    selectedStopId: selectedStop.id,
    routes,
    buses: Array.isArray(stored.buses) ? stored.buses : fresh.buses,
    drivers: Array.isArray(stored.drivers) ? stored.drivers : fresh.drivers,
    simulations,
    notifications: Array.isArray(stored.notifications)
      ? stored.notifications.slice(0, MAX_NOTIFICATIONS)
      : fresh.notifications,
    delayReports: Array.isArray(stored.delayReports) ? stored.delayReports : fresh.delayReports,
    handledEventKeys: Array.isArray(stored.handledEventKeys)
      ? stored.handledEventKeys.slice(-MAX_EVENT_KEYS)
      : [],
    backendMessage: isSupabaseConfigured
      ? fresh.backendMessage
      : "Restored local demo state. All locations and times remain simulated.",
  };
}

function notificationFromEvent(event: SimulationEvent): NotificationItem {
  return {
    id: `event-${event.key}`,
    type: event.type as NotificationType,
    title: event.title,
    message: event.message,
    createdAt: event.createdAt,
    readAt: null,
    routeId: event.routeId,
    busId: undefined,
    simulated: true,
  };
}

function appendEvents(
  state: AppState,
  events: SimulationEvent[],
): Pick<AppState, "notifications" | "delayReports" | "handledEventKeys"> {
  const seen = new Set(state.handledEventKeys);
  const unseen = events.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
  if (unseen.length === 0) {
    return {
      notifications: state.notifications,
      delayReports: state.delayReports,
      handledEventKeys: state.handledEventKeys,
    };
  }

  const busByRoute = new Map(state.buses.map((bus) => [bus.routeId, bus.id]));
  const newDelayReports: DelayReport[] = unseen
    .filter((item) => item.type === "delay")
    .map((item) => ({
      id: `report-${item.key}`,
      routeId: item.routeId,
      busId: busByRoute.get(item.routeId) ?? "unassigned",
      delaySeconds:
        item.delaySeconds ??
        (item.key.includes("manual-delay") ? 300 : item.key.includes(":1") ? 120 : 90),
      reason: item.message,
      createdAt: item.createdAt,
      simulated: true,
    }));

  return {
    notifications: [
      ...unseen.map(notificationFromEvent),
      ...state.notifications,
    ].slice(0, MAX_NOTIFICATIONS),
    delayReports: [...newDelayReports, ...state.delayReports].slice(0, 60),
    handledEventKeys: Array.from(seen).slice(-MAX_EVENT_KEYS),
  };
}

/** Rebuild a simple stop-to-stop polyline after an administrator changes stops. */
function normalizeRouteStops(route: Route): Route {
  const stops = [...route.stops]
    .sort((a, b) => a.order - b.order)
    .map((stop, index) => ({ ...stop, order: index + 1 }));
  const shape: Route["shape"] = [];
  const stopIndices = stops.map((stop) => {
    if (stop.lat == null || stop.lng == null) return -1;
    shape.push({ lat: stop.lat, lng: stop.lng });
    return shape.length - 1;
  });
  return { ...route, stops, shape, stopIndices, geometrySource: "straight" };
}

function updateRouteById(
  state: AppState,
  routeId: string,
  updater: (route: Route) => Route,
): Route[] {
  return state.routes.map((route) => (route.id === routeId ? updater(route) : route));
}

function removeRouteCascade(state: AppState, routeId: string): AppState {
  if (state.routes.length <= 1) {
    return { ...state, error: "At least one route must remain in the demo catalog." };
  }
  const routes = state.routes.filter((route) => route.id !== routeId);
  const buses = state.buses.filter((bus) => bus.routeId !== routeId);
  const simulations = { ...state.simulations };
  delete simulations[routeId];
  const remoteLocations = { ...state.remoteLocations };
  delete remoteLocations[routeId];
  const selectedRouteId =
    state.selectedRouteId === routeId ? routes[0].id : state.selectedRouteId;
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];
  return {
    ...state,
    routes,
    buses,
    simulations,
    remoteLocations,
    notifications: state.notifications.filter((item) => item.routeId !== routeId),
    delayReports: state.delayReports.filter((item) => item.routeId !== routeId),
    selectedRouteId: selectedRoute.id,
    selectedStopId:
      selectedRoute.stops[Math.min(2, selectedRoute.stops.length - 1)]?.id ??
      selectedRoute.stops[0].id,
    error: null,
  };
}

export type AppAction =
  | { type: "HYDRATE"; state: AppState }
  | { type: "TICK"; now: number; deltaSeconds: number; speedMultiplier: number }
  | { type: "SET_USER"; user: AppUser | null }
  | { type: "SET_AUTH_LOADING"; value: boolean }
  | { type: "SET_ONLINE"; value: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_REALTIME_STATUS"; value: RealtimeStatus }
  | { type: "SET_BACKEND_MESSAGE"; message: string; ready?: boolean }
  | {
      type: "SET_BACKEND_DATA";
      routes: Route[];
      buses: Bus[];
      drivers: DemoDriver[];
      delayReports?: DelayReport[];
      backendTrips?: TripRecord[];
      message: string;
    }
  | { type: "SET_REMOTE_LOCATION"; location: AppState["remoteLocations"][string] }
  | { type: "CLEAR_REMOTE_LOCATION"; routeId: string }
  | { type: "SET_ROAD_GEOMETRY"; routeId: string; geometry: RoadGeometry }
  | { type: "SELECT_ROUTE"; routeId: string }
  | { type: "SELECT_STOP"; stopId: string }
  | { type: "APPLY_SIMULATION_UPDATE"; routeId: string; update: SimulationUpdate }
  | { type: "REPLACE_SIMULATION"; state: SimulationState }
  | { type: "MARK_READ"; id: string }
  | { type: "MARK_ALL_READ" }
  | { type: "DELETE_NOTIFICATION"; id: string }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "ADD_NOTIFICATION"; notification: NotificationItem }
  | { type: "UPSERT_BUS"; id: string; isNew: boolean; input: BusInput }
  | { type: "DELETE_BUS"; id: string }
  | { type: "UPSERT_ROUTE"; id: string; isNew: boolean; input: RouteInput; templateRouteId?: string }
  | { type: "DELETE_ROUTE"; id: string }
  | { type: "UPSERT_STOP"; id: string; isNew: boolean; routeId: string; input: StopInput }
  | { type: "DELETE_STOP"; routeId: string; id: string }
  | { type: "ASSIGN_DRIVER"; busId: string; driverId: string | null }
  | { type: "ADD_DELAY_REPORT"; report: DelayReport }
  | { type: "DELETE_DELAY_REPORT"; id: string };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "TICK": {
      const allEvents: SimulationEvent[] = [];
      const simulations = { ...state.simulations };
      for (const route of state.routes) {
        const simulation = simulations[route.id];
        if (!simulation || simulation.tripStatus !== "active" || !simulation.isRunning || !simulation.isSharing) continue;
        try {
          const geometry = buildRouteGeometry(route);
          const result = advanceSimulation(simulation, {
            route,
            geometry,
            now: action.now,
            deltaSeconds: action.deltaSeconds,
            speedMultiplier: action.speedMultiplier,
          });
          simulations[route.id] = result.state;
          if (result.events.length > 0) allEvents.push(...result.events);
        } catch {
          // Ignore a malformed admin-created route instead of crashing the app.
        }
      }
      return {
        ...state,
        currentTime: action.now,
        simulations,
        ...appendEvents(state, allEvents),
      };
    }

    case "SET_USER":
      return {
        ...state,
        user: action.user,
        authLoading: false,
        // Do not keep privileged location data after sign-out or a role switch.
        remoteLocations: state.user?.id === action.user?.id ? state.remoteLocations : {},
      };

    case "SET_AUTH_LOADING":
      return { ...state, authLoading: action.value };

    case "SET_ONLINE":
      return { ...state, isOnline: action.value };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "SET_REALTIME_STATUS":
      return { ...state, realtimeStatus: action.value };

    case "SET_BACKEND_MESSAGE":
      return {
        ...state,
        backendMessage: action.message,
        backendReady: action.ready ?? state.backendReady,
      };

    case "SET_BACKEND_DATA": {
      const routes = action.routes.length > 0 ? action.routes : state.routes;
      const selectedRoute =
        routes.find((route) => route.id === state.selectedRouteId) ?? routes[0];
      const selectedStop =
        selectedRoute.stops.find((stop) => stop.id === state.selectedStopId) ??
        selectedRoute.stops[0];
      const simulations = { ...state.simulations };
      for (const route of routes) {
        if (!simulations[route.id]) {
          simulations[route.id] = createLocalSimulationState(route.id, state.currentTime);
        }
      }
      return {
        ...state,
        routes,
        buses: action.buses,
        drivers: action.drivers,
        delayReports: action.delayReports ?? state.delayReports,
        backendTrips: action.backendTrips ?? state.backendTrips,
        simulations,
        selectedRouteId: selectedRoute.id,
        selectedStopId: selectedStop.id,
        backendReady: true,
        backendMessage: action.message,
        error: null,
      };
    }

    case "SET_REMOTE_LOCATION":
      return {
        ...state,
        remoteLocations: {
          ...state.remoteLocations,
          [action.location.routeId]: action.location,
        },
      };

    case "CLEAR_REMOTE_LOCATION": {
      if (!state.remoteLocations[action.routeId]) return state;
      const remoteLocations = { ...state.remoteLocations };
      delete remoteLocations[action.routeId];
      return { ...state, remoteLocations };
    }

    case "SET_ROAD_GEOMETRY": {
      const route = state.routes.find((item) => item.id === action.routeId);
      if (!route || route.geometrySource === "verified" ||
          routeCoordinateKey(route) !== action.geometry.coordinateKey ||
          action.geometry.shape.length < 2 || action.geometry.stopIndices.length !== route.stops.length) return state;
      const previousLength = buildRouteGeometry(route).totalDistanceMeters;
      const updatedRoute: Route = {
        ...route,
        shape: action.geometry.shape,
        stopIndices: action.geometry.stopIndices,
        geometrySource: "road",
      };
      const newLength = buildRouteGeometry(updatedRoute).totalDistanceMeters;
      const simulation = state.simulations[route.id];
      const progress = previousLength > 0 && simulation
        ? Math.min(1, Math.max(0, simulation.distanceMeters / previousLength)) : 0;
      return {
        ...state,
        routes: state.routes.map((item) => item.id === route.id ? updatedRoute : item),
        simulations: simulation ? {
          ...state.simulations,
          [route.id]: { ...simulation, distanceMeters: progress * newLength },
        } : state.simulations,
      };
    }

    case "SELECT_ROUTE": {
      const route = state.routes.find((item) => item.id === action.routeId);
      if (!route) return state;
      return {
        ...state,
        selectedRouteId: route.id,
        selectedStopId:
          route.stops[Math.min(2, route.stops.length - 1)]?.id ?? route.stops[0].id,
        user:
          state.user?.role === "student"
            ? { ...state.user, assignedRouteId: route.id }
            : state.user,
      };
    }

    case "SELECT_STOP":
      return { ...state, selectedStopId: action.stopId };

    case "APPLY_SIMULATION_UPDATE": {
      if (!state.simulations[action.routeId]) return state;
      return {
        ...state,
        simulations: {
          ...state.simulations,
          [action.routeId]: action.update.state,
        },
        ...appendEvents(state, action.update.events),
        error: null,
      };
    }

    case "REPLACE_SIMULATION":
      return {
        ...state,
        simulations: {
          ...state.simulations,
          [action.state.routeId]: action.state,
        },
      };

    case "MARK_READ":
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.id ? { ...item, readAt: state.currentTime } : item,
        ),
      };

    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map((item) => ({
          ...item,
          readAt: item.readAt ?? state.currentTime,
        })),
      };

    case "DELETE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter((item) => item.id !== action.id),
      };

    case "CLEAR_NOTIFICATIONS":
      return { ...state, notifications: [] };

    case "ADD_NOTIFICATION": {
      const seen = new Set(state.handledEventKeys);
      if (seen.has(action.notification.id)) return state;
      seen.add(action.notification.id);
      return {
        ...state,
        notifications: [action.notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
        handledEventKeys: Array.from(seen).slice(-MAX_EVENT_KEYS),
      };
    }

    case "UPSERT_BUS": {
      const route = state.routes.find((item) => item.id === action.input.routeId);
      if (!route) return { ...state, error: "The selected route does not exist." };
      const duplicate = state.buses.some(
        (bus) =>
          bus.id !== action.id &&
          bus.number.toLowerCase() === action.input.number.toLowerCase(),
      );
      if (duplicate) return { ...state, error: "A bus with this number already exists." };
      const bus: Bus = {
        id: action.id,
        number: action.input.number,
        routeId: action.input.routeId,
        driverId: action.input.driverId || null,
        capacity: action.input.capacity,
        status: action.input.status,
        model: action.input.model,
        serviceAvailability:
          action.input.serviceAvailability || "Service hours to be configured",
      };
      const buses = action.isNew
        ? [...state.buses, bus]
        : state.buses.map((item) => (item.id === action.id ? bus : item));
      return { ...state, buses, error: null };
    }

    case "DELETE_BUS": {
      if (state.buses.length <= 1) {
        return { ...state, error: "At least one bus must remain in the demo catalog." };
      }
      return {
        ...state,
        buses: state.buses.filter((bus) => bus.id !== action.id),
        error: null,
      };
    }

    case "UPSERT_ROUTE": {
      if (!action.isNew) {
        const routes = updateRouteById(state, action.id, (route) => ({
          ...route,
          code: action.input.code,
          name: action.input.name,
          busNumber: action.input.busNumber,
          startLocation: action.input.startLocation,
          destination: action.input.destination,
          description: action.input.description,
          averageSpeedKmh: action.input.averageSpeedKmh,
          estimatedDurationMinutes: action.input.estimatedDurationMinutes,
          status: action.input.status,
        }));
        return { ...state, routes, error: null };
      }

      const template =
        state.routes.find((route) => route.id === action.templateRouteId) ?? state.routes[0];
      const stops = template.stops.map((stop) => ({
        ...stop,
        id: makeId("stop"),
      }));
      const newRoute: Route = {
        id: action.id,
        code: action.input.code,
        name: action.input.name,
        busNumber: action.input.busNumber,
        startLocation: action.input.startLocation,
        destination: action.input.destination,
        description:
          action.input.description ||
          "New route uses copied geometry. Verify and replace the shape before use.",
        stops,
        shape: template.shape.map((point) => ({ ...point })),
        stopIndices: [...template.stopIndices],
        color: ["#2563eb", "#0f766e", "#7c3aed", "#d97706"][
          state.routes.length % 4
        ],
        averageSpeedKmh: action.input.averageSpeedKmh,
        estimatedDurationMinutes: action.input.estimatedDurationMinutes,
        status: action.input.status,
      };
      return {
        ...state,
        routes: [...state.routes, newRoute],
        simulations: {
          ...state.simulations,
          [action.id]: createLocalSimulationState(action.id, state.currentTime),
        },
        error: null,
      };
    }

    case "DELETE_ROUTE":
      return removeRouteCascade(state, action.id);

    case "UPSERT_STOP": {
      const routes = updateRouteById(state, action.routeId, (route) => {
        const existing = route.stops.find((stop) => stop.id === action.id);
        const nextStop = {
          ...existing,
          id: action.id,
          name: action.input.name,
          lat: action.input.lat,
          lng: action.input.lng,
          order: action.input.order,
          locationSource: "Administrator supplied",
          landmark: existing?.landmark ?? "Stop",
        };
        const stops = action.isNew
          ? [...route.stops, nextStop]
          : route.stops.map((stop) => (stop.id === action.id ? nextStop : stop));
        return normalizeRouteStops({ ...route, stops });
      });
      return { ...state, routes, error: null };
    }

    case "DELETE_STOP": {
      const route = state.routes.find((item) => item.id === action.routeId);
      if (!route || route.stops.length <= 2) {
        return { ...state, error: "A route must keep at least two stops." };
      }
      const mappedRemaining = route.stops.filter(
        (stop) => stop.id !== action.id && stop.lat != null && stop.lng != null,
      );
      if (mappedRemaining.length < 2) {
        return { ...state, error: "A route needs at least two mapped stop locations." };
      }
      const routes = updateRouteById(state, action.routeId, (item) =>
        normalizeRouteStops({
          ...item,
          stops: item.stops.filter((stop) => stop.id !== action.id),
        }),
      );
      const selectedStopId =
        state.selectedStopId === action.id
          ? routes.find((item) => item.id === action.routeId)?.stops[0].id ??
            state.selectedStopId
          : state.selectedStopId;
      return { ...state, routes, selectedStopId, error: null };
    }

    case "ASSIGN_DRIVER": {
      if (
        action.driverId &&
        !state.drivers.some((driver) => driver.id === action.driverId)
      ) {
        return { ...state, error: "The selected driver does not exist." };
      }
      return {
        ...state,
        buses: state.buses.map((bus) =>
          bus.id === action.busId ? { ...bus, driverId: action.driverId } : bus,
        ),
        error: null,
      };
    }

    case "ADD_DELAY_REPORT":
      return {
        ...state,
        delayReports: [action.report, ...state.delayReports].slice(0, 60),
      };

    case "DELETE_DELAY_REPORT":
      return {
        ...state,
        delayReports: state.delayReports.filter((report) => report.id !== action.id),
      };

    default:
      return state;
  }
}

export function getBackendModeLabel() {
  return backendConfig.demoMode ? "DEMO MODE" : "SUPABASE MODE";
}
