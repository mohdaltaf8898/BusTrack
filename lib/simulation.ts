import { getTrafficCondition } from "@/lib/eta";
import type {
  Route,
  RouteGeometry,
  SimulationEvent,
  SimulationState,
} from "@/lib/types";

export const DEFAULT_SIMULATION_MULTIPLIER = 8;
export const DEFAULT_STALE_LOCATION_SECONDS = 45;
export const MANUAL_DELAY_SECONDS = 300;
export const AUTOMATIC_DELAY_SECONDS = 90;
const ARRIVAL_THRESHOLD_METERS = 350;
const MAX_TICK_SECONDS = 5;

export interface SimulationUpdate {
  state: SimulationState;
  events: SimulationEvent[];
}

export function createSimulationState(
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
    lap: 0,
    elapsedSeconds: 0,
    announcedEventKeys: [],
    source: "simulation",
    ...overrides,
  };
}

function event(
  key: string,
  type: SimulationEvent["type"],
  route: Route,
  createdAt: number,
  title: string,
  message: string,
  stop?: { id: string; name: string },
): SimulationEvent {
  return {
    key: `${route.id}:${key}`,
    type,
    routeId: route.id,
    stopId: stop?.id,
    stopName: stop?.name,
    title,
    message,
    createdAt,
  };
}

export function startDemoTrip(
  state: SimulationState,
  route: Route,
  now: number,
): SimulationUpdate {
  const lap = state.lap + 1;
  const next: SimulationState = {
    ...state,
    distanceMeters: 0,
    isRunning: true,
    isSharing: true,
    tripStatus: "active",
    delaySeconds: 0,
    lastUpdateAt: now,
    startedAt: now,
    endedAt: null,
    lap,
    elapsedSeconds: 0,
    announcedEventKeys: [],
    source: "simulation",
  };
  return {
    state: next,
    events: [
      event(
        `trip-started:${lap}:${now}`,
        "trip_started",
        route,
        now,
        `Trip started · ${route.busNumber}`,
        `${route.code} has started sharing a simulated location from ${route.startLocation}.`,
      ),
    ],
  };
}

export function endDemoTrip(
  state: SimulationState,
  route: Route,
  now: number,
): SimulationUpdate {
  if (state.tripStatus !== "active" && state.tripStatus !== "offline") {
    return { state, events: [] };
  }
  const next: SimulationState = {
    ...state,
    isRunning: false,
    isSharing: false,
    tripStatus: "completed",
    endedAt: now,
    lastUpdateAt: now,
  };
  return {
    state: next,
    events: [
      event(
        `trip-completed:${state.lap}:${now}`,
        "trip_completed",
        route,
        now,
        `Trip completed · ${route.busNumber}`,
        `${route.code} reached ${route.destination}. Location sharing has stopped in this demo.`,
      ),
    ],
  };
}

export function setSharing(
  state: SimulationState,
  route: Route,
  enabled: boolean,
  now: number,
): SimulationUpdate {
  if (enabled && state.tripStatus !== "active") {
    return { state, events: [] };
  }
  const key = `sharing-off:${state.lap}`;
  const alreadyAnnounced = state.announcedEventKeys.includes(key);
  const next: SimulationState = {
    ...state,
    isSharing: enabled,
    lastUpdateAt: enabled ? now : state.lastUpdateAt,
  };
  const events: SimulationEvent[] = [];
  if (!enabled && !alreadyAnnounced && state.tripStatus === "active") {
    next.announcedEventKeys = [...state.announcedEventKeys, key];
    events.push(
      event(
        key,
        "location_unavailable",
        route,
        now,
        `Location paused · ${route.busNumber}`,
        "The driver stopped sharing simulated location updates. The last known position remains visible.",
      ),
    );
  }
  return { state: next, events };
}

export function togglePause(state: SimulationState): SimulationUpdate {
  if (state.tripStatus !== "active") return { state, events: [] };
  return {
    state: { ...state, isRunning: !state.isRunning },
    events: [],
  };
}

export function resetSimulation(
  state: SimulationState,
  now: number,
): SimulationUpdate {
  return {
    state: createSimulationState(state.routeId, now, { lap: state.lap }),
    events: [],
  };
}

export function injectDelay(
  state: SimulationState,
  route: Route,
  now: number,
): SimulationUpdate {
  const delaySeconds = state.delaySeconds + MANUAL_DELAY_SECONDS;
  const key = `manual-delay:${state.lap}:${delaySeconds}`;
  const next: SimulationState = {
    ...state,
    delaySeconds,
    lastUpdateAt: now,
  };
  const delayEvent = event(
    key,
    "delay",
    route,
    now,
    `Delay reported · ${route.busNumber}`,
    `A simulated 5-minute traffic delay was added. ETAs are estimates and have been recalculated.`,
  );
  delayEvent.delaySeconds = MANUAL_DELAY_SECONDS;
  return { state: next, events: [delayEvent] };
}

export function setSimulationOffline(
  state: SimulationState,
  route: Route,
  now: number,
): SimulationUpdate {
  const key = `offline:${state.lap}`;
  if (state.announcedEventKeys.includes(key)) {
    return {
      state: { ...state, tripStatus: "offline", isRunning: false, isSharing: false },
      events: [],
    };
  }
  return {
    state: {
      ...state,
      tripStatus: "offline",
      isRunning: false,
      isSharing: false,
      announcedEventKeys: [...state.announcedEventKeys, key],
    },
    events: [
      event(
        key,
        "location_unavailable",
        route,
        now,
        `Location unavailable · ${route.busNumber}`,
        "The simulated connection was lost. The map is showing the last known position.",
      ),
    ],
  };
}

export function resumeFromOffline(
  state: SimulationState,
  now: number,
): SimulationUpdate {
  if (state.tripStatus !== "offline") return { state, events: [] };
  return {
    state: {
      ...state,
      tripStatus: "active",
      isRunning: true,
      isSharing: true,
      lastUpdateAt: now,
    },
    events: [],
  };
}

export interface AdvanceOptions {
  route: Route;
  geometry: RouteGeometry;
  now: number;
  deltaSeconds: number;
  speedMultiplier?: number;
}

/**
 * Pure simulation step. All movement is constrained to the route polyline.
 * `speedMultiplier` makes a whole journey visible in a short demonstration;
 * it is clearly labelled in the UI as simulated time.
 */
export function advanceSimulation(
  state: SimulationState,
  { route, geometry, now, deltaSeconds, speedMultiplier = DEFAULT_SIMULATION_MULTIPLIER }: AdvanceOptions,
): SimulationUpdate {
  if (
    state.tripStatus !== "active" ||
    !state.isRunning ||
    !state.isSharing ||
    geometry.totalDistanceMeters <= 0
  ) {
    return { state, events: [] };
  }

  const safeDelta = Math.max(0, Math.min(MAX_TICK_SECONDS, deltaSeconds));
  if (safeDelta === 0) return { state, events: [] };

  const traffic = getTrafficCondition(route, state.elapsedSeconds, state.distanceMeters);
  const speedKmh = route.averageSpeedKmh * traffic.factor * Math.max(1, speedMultiplier);
  const traveled = (speedKmh * 1000 / 3600) * safeDelta;
  const previousDistance = state.distanceMeters;
  const distanceMeters = Math.min(
    geometry.totalDistanceMeters,
    previousDistance + traveled,
  );
  const elapsedSeconds = state.elapsedSeconds + safeDelta;
  const events: SimulationEvent[] = [];
  const announcedEventKeys = [...state.announcedEventKeys];
  let delaySeconds = state.delaySeconds;

  // Two deterministic congestion pockets add a one-time simulated delay.
  [0.35, 0.72].forEach((fraction, index) => {
    const threshold = geometry.totalDistanceMeters * fraction;
    const key = `traffic-delay:${state.lap}:${index}`;
    if (
      previousDistance < threshold &&
      distanceMeters >= threshold &&
      !announcedEventKeys.includes(key)
    ) {
      announcedEventKeys.push(key);
      const addedDelay = AUTOMATIC_DELAY_SECONDS + index * 30;
      delaySeconds += addedDelay;
      const delayEvent = event(
        key,
        "delay",
        route,
        now,
        `Traffic slowdown · ${route.busNumber}`,
        `Simulated congestion added about ${Math.round(
          addedDelay / 60,
        )} minutes to upcoming stop estimates.`,
      );
      delayEvent.delaySeconds = addedDelay;
      events.push(delayEvent);
    }
  });

  route.stops.forEach((stop, index) => {
    const stopDistance = geometry.stopDistances[index];
    if (index === 0 || stopDistance == null) return;

    const approachKey = `approach:${state.lap}:${stop.id}`;
    if (
      distanceMeters >= stopDistance - ARRIVAL_THRESHOLD_METERS &&
      distanceMeters < stopDistance - 20 &&
      previousDistance < stopDistance - 20 &&
      !announcedEventKeys.includes(approachKey)
    ) {
      announcedEventKeys.push(approachKey);
      events.push(
        event(
          approachKey,
          "approaching",
          route,
          now,
          `Approaching ${stop.name}`,
          `${route.busNumber} is close to ${stop.name}. This is a simulated proximity alert.`,
          { id: stop.id, name: stop.name },
        ),
      );
    }

    const arrivalKey = `arrival:${state.lap}:${stop.id}`;
    if (
      previousDistance < stopDistance &&
      distanceMeters >= stopDistance &&
      !announcedEventKeys.includes(arrivalKey)
    ) {
      announcedEventKeys.push(arrivalKey);
      events.push(
        event(
          arrivalKey,
          "arrival",
          route,
          now,
          `Arrived at ${stop.name}`,
          `${route.busNumber} reached ${stop.name} in the simulation.`,
          { id: stop.id, name: stop.name },
        ),
      );
    }
  });

  const reachedDestination = distanceMeters >= geometry.totalDistanceMeters - 0.5;
  const completedKey = `trip-completed:${state.lap}:auto`;
  if (reachedDestination && !announcedEventKeys.includes(completedKey)) {
    announcedEventKeys.push(completedKey);
    events.push(
      event(
        completedKey,
        "trip_completed",
        route,
        now,
        `Trip completed · ${route.busNumber}`,
        `${route.code} reached ${route.destination} in the simulation. Sharing stopped at the end of the trip.`,
      ),
    );
  }

  return {
    state: {
      ...state,
      distanceMeters,
      elapsedSeconds,
      delaySeconds,
      lastUpdateAt: now,
      isRunning: !reachedDestination,
      isSharing: !reachedDestination,
      tripStatus: reachedDestination ? "completed" : "active",
      endedAt: reachedDestination ? now : state.endedAt,
      announcedEventKeys,
    },
    events,
  };
}
