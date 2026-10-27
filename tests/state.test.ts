import { describe, expect, it } from "vitest";
import { sampleRoutes } from "@/data/routes";
import {
  APP_STORAGE_KEY,
  appReducer,
  createInitialState,
  hydratePersistedState,
  toPersistedState,
} from "@/lib/app-reducer";
import { backendConfig } from "@/lib/config";
import { deriveRouteSnapshot } from "@/lib/selectors";
import { setSimulationOffline } from "@/lib/simulation";
import type { NotificationItem, SimulationEvent } from "@/lib/types";

const now = 1_700_000_000_000;

function hydratedState() {
  return { ...createInitialState(now), hydrated: true, currentTime: now };
}

describe("credential-free demo mode", () => {
  it("works without Supabase credentials and loads the central sample data", () => {
    expect(backendConfig.demoMode).toBe(true);
    const state = hydratedState();
    expect(state.routes).toHaveLength(3);
    expect(state.buses.length).toBeGreaterThanOrEqual(3);
    expect(state.user?.role).toBe("student");
    expect(state.backendMessage).toMatch(/simulation|demo/i);
    expect(state.notifications.every((item) => item.simulated)).toBe(true);
  });

  it("persists and restores demo state while disabling stale movement", () => {
    const state = hydratedState();
    state.simulations["route-a"].distanceMeters = 1200;
    const persisted = toPersistedState(state);
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(persisted));
    const restored = hydratePersistedState(persisted, now + 1000);
    expect(restored.selectedRouteId).toBe(state.selectedRouteId);
    expect(restored.routes).toHaveLength(3);
    expect(restored.simulations["route-a"].distanceMeters).toBe(1200);
    expect(restored.simulations["route-a"].isRunning).toBe(false);
    expect(restored.simulations["route-a"].tripStatus).toBe("offline");
  });
});

describe("student flow and reducer", () => {
  it("switches routes without a refresh and moves the selected stop to that route", () => {
    const state = hydratedState();
    expect(state.selectedRouteId).toBe("route-a");
    const switched = appReducer(state, { type: "SELECT_ROUTE", routeId: "route-c" });
    expect(switched.selectedRouteId).toBe("route-c");
    expect(switched.routes.find((route) => route.id === "route-c")?.stops).toContainEqual(
      expect.objectContaining({ id: switched.selectedStopId }),
    );
    const snapshot = deriveRouteSnapshot(switched, "route-c");
    expect(snapshot.route.id).toBe("route-c");
    expect(snapshot.busPosition.lat).toBeCloseTo(snapshot.route.stops[0].lat, 5);
    expect(snapshot.busPosition.lng).toBeCloseTo(snapshot.route.stops[0].lng, 5);
  });

  it("ticks the simulation and updates ETAs and upcoming stops", () => {
    const state = hydratedState();
    const before = deriveRouteSnapshot(state, "route-a");
    const ticked = appReducer(state, {
      type: "TICK",
      now: now + 10_000,
      deltaSeconds: 10,
      speedMultiplier: 8,
    });
    const after = deriveRouteSnapshot(ticked, "route-a");
    expect(ticked.simulations["route-a"].distanceMeters).toBeGreaterThan(
      state.simulations["route-a"].distanceMeters,
    );
    expect(after.selectedStopEta.etaSeconds).toBeLessThanOrEqual(
      before.selectedStopEta.etaSeconds,
    );
    expect(after.stopEtas.length).toBe(after.route.stops.length);
  });

  it("deduplicates simulation alerts by stable event key", () => {
    const state = hydratedState();
    const event: SimulationEvent = {
      key: "route-a:duplicate:1",
      type: "delay",
      routeId: "route-a",
      title: "Duplicate alert",
      message: "This should only appear once.",
      createdAt: now,
      delaySeconds: 120,
    };
    const update = { state: state.simulations["route-a"], events: [event] };
    const once = appReducer(state, {
      type: "APPLY_SIMULATION_UPDATE",
      routeId: "route-a",
      update,
    });
    const twice = appReducer(once, {
      type: "APPLY_SIMULATION_UPDATE",
      routeId: "route-a",
      update,
    });
    expect(twice.notifications.filter((item) => item.id === "event-route-a:duplicate:1")).toHaveLength(1);
    expect(twice.handledEventKeys).toContain("route-a:duplicate:1");
    expect(twice.delayReports.some((report) => report.delaySeconds === 120)).toBe(true);
  });

  it("marks notifications read and clears the notification center", () => {
    const state = hydratedState();
    const target = state.notifications.find((item) => !item.readAt);
    expect(target).toBeDefined();
    const read = appReducer(state, { type: "MARK_READ", id: target!.id });
    expect(read.notifications.find((item) => item.id === target!.id)?.readAt).toBe(now);
    const allRead = appReducer(state, { type: "MARK_ALL_READ" });
    expect(allRead.notifications.every((item) => item.readAt)).toBe(true);
    const cleared = appReducer(state, { type: "CLEAR_NOTIFICATIONS" });
    expect(cleared.notifications).toHaveLength(0);
  });

  it("shows an offline status and a stale warning when the connection is lost", () => {
    const state = hydratedState();
    const simulation = state.simulations["route-a"];
    const offlineUpdate = setSimulationOffline(simulation, state.routes[0], now);
    const offlineState = appReducer(state, {
      type: "APPLY_SIMULATION_UPDATE",
      routeId: "route-a",
      update: offlineUpdate,
    });
    const staleState = {
      ...offlineState,
      currentTime: now + backendConfig.staleLocationSeconds * 1000 + 1000,
    };
    const snapshot = deriveRouteSnapshot(staleState, "route-a");
    expect(snapshot.busStatus).toBe("offline");
    expect(snapshot.isStale).toBe(true);
    expect(snapshot.sourceLabel).toBe("Simulated");
    expect(snapshot.busPosition.lat).toBeGreaterThan(17);
    expect(snapshot.busPosition.lng).toBeGreaterThan(78);
    expect(
      staleState.notifications.some((item) => item.type === "location_unavailable"),
    ).toBe(true);
  });
});

describe("admin CRUD in local demo mode", () => {
  it("validates bus changes and keeps at least one bus", () => {
    const state = hydratedState();
    const added = appReducer(state, {
      type: "UPSERT_BUS",
      id: "bus-test",
      isNew: true,
      input: {
        number: "BT-TEST",
        routeId: "route-a",
        driverId: null,
        capacity: 40,
        status: "active",
        model: "Test coach",
        serviceAvailability: "Test only",
      },
    });
    expect(added.buses.some((bus) => bus.number === "BT-TEST")).toBe(true);
    const duplicate = appReducer(added, {
      type: "UPSERT_BUS",
      id: "bus-other",
      isNew: true,
      input: {
        number: "BT-TEST",
        routeId: "route-a",
        driverId: null,
        capacity: 40,
        status: "active",
        model: "Duplicate",
        serviceAvailability: "",
      },
    });
    expect(duplicate.error).toMatch(/already exists/i);
    const deleted = appReducer(added, { type: "DELETE_BUS", id: "bus-test" });
    expect(deleted.buses.some((bus) => bus.id === "bus-test")).toBe(false);
  });

  it("keeps route geometry synchronized after a stop change", () => {
    const state = hydratedState();
    const route = state.routes[0];
    const changed = appReducer(state, {
      type: "UPSERT_STOP",
      id: route.stops[1].id,
      isNew: false,
      routeId: route.id,
      input: {
        routeId: route.id,
        name: "Renamed Test Stop",
        lat: 17.36,
        lng: 78.37,
        order: 2,
      },
    });
    const updatedRoute = changed.routes[0];
    expect(updatedRoute.stops[1].name).toBe("Renamed Test Stop");
    expect(updatedRoute.shape).toHaveLength(updatedRoute.stops.length);
    expect(updatedRoute.stopIndices).toEqual(
      updatedRoute.stops.map((_, index) => index),
    );
    expect(updatedRoute.shape[1].lat).toBeCloseTo(17.36, 6);
  });

  it("rejects deleting a stop when only two stops would remain", () => {
    const state = hydratedState();
    let twoStopState = state;
    const route = state.routes[0];
    for (const stop of route.stops.slice(2)) {
      twoStopState = appReducer(twoStopState, {
        type: "DELETE_STOP",
        routeId: route.id,
        id: stop.id,
      });
    }
    expect(twoStopState.routes[0].stops).toHaveLength(2);
    const rejected = appReducer(twoStopState, {
      type: "DELETE_STOP",
      routeId: route.id,
      id: route.stops[0].id,
    });
    expect(rejected.error).toMatch(/at least two stops/i);
  });
});

describe("notification type integrity", () => {
  it("uses ISO-like millisecond timestamps and a simulated label", () => {
    const state = hydratedState();
    const notification: NotificationItem = state.notifications[0];
    expect(notification.createdAt).toBeLessThanOrEqual(now);
    expect(notification.simulated).toBe(true);
    expect(notification.title.length).toBeGreaterThan(0);
    expect(sampleRoutes.length).toBeGreaterThanOrEqual(3);
  });
});
