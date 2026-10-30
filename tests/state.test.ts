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
    expect(state.routes).toHaveLength(16);
    expect(state.buses.length).toBeGreaterThanOrEqual(3);
    expect(state.user?.role).toBe("student");
    expect(state.backendMessage).toMatch(/simulation|demo/i);
    expect(state.notifications.every((item) => item.simulated)).toBe(true);
  });

  it("persists and restores demo state while disabling stale movement", () => {
    const state = hydratedState();
    state.simulations["route-01"].distanceMeters = 1200;
    const persisted = toPersistedState(state);
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(persisted));
    const restored = hydratePersistedState(persisted, now + 1000);
    expect(restored.selectedRouteId).toBe(state.selectedRouteId);
    expect(restored.routes).toHaveLength(16);
    expect(restored.simulations["route-01"].distanceMeters).toBe(1200);
    expect(restored.simulations["route-01"].isRunning).toBe(false);
    expect(restored.simulations["route-01"].tripStatus).toBe("offline");
  });
});

describe("student flow and reducer", () => {
  it("switches routes without a refresh and moves the selected stop to that route", () => {
    const state = hydratedState();
    expect(state.selectedRouteId).toBe("route-01");
    const switched = appReducer(state, { type: "SELECT_ROUTE", routeId: "route-03" });
    expect(switched.selectedRouteId).toBe("route-03");
    expect(switched.routes.find((route) => route.id === "route-03")?.stops).toContainEqual(
      expect.objectContaining({ id: switched.selectedStopId }),
    );
    const snapshot = deriveRouteSnapshot(switched, "route-03");
    expect(snapshot.route.id).toBe("route-03");
    expect(snapshot.busPosition.lat).toBeCloseTo(snapshot.route.shape[0].lat, 5);
    expect(snapshot.busPosition.lng).toBeCloseTo(snapshot.route.shape[0].lng, 5);
  });

  it("ticks the simulation and updates ETAs and upcoming stops", () => {
    const state = hydratedState();
    const before = deriveRouteSnapshot(state, "route-01");
    const ticked = appReducer(state, {
      type: "TICK",
      now: now + 10_000,
      deltaSeconds: 10,
      speedMultiplier: 8,
    });
    const after = deriveRouteSnapshot(ticked, "route-01");
    expect(ticked.simulations["route-01"].distanceMeters).toBeGreaterThan(
      state.simulations["route-01"].distanceMeters,
    );
    expect(after.selectedStopEta.etaSeconds).toBeLessThanOrEqual(
      before.selectedStopEta.etaSeconds as number,
    );
    expect(after.stopEtas.length).toBe(after.route.stops.length);
  });

  it("deduplicates simulation alerts by stable event key", () => {
    const state = hydratedState();
    const event: SimulationEvent = {
      key: "route-01:duplicate:1",
      type: "delay",
      routeId: "route-01",
      title: "Duplicate alert",
      message: "This should only appear once.",
      createdAt: now,
      delaySeconds: 120,
    };
    const update = { state: state.simulations["route-01"], events: [event] };
    const once = appReducer(state, {
      type: "APPLY_SIMULATION_UPDATE",
      routeId: "route-01",
      update,
    });
    const twice = appReducer(once, {
      type: "APPLY_SIMULATION_UPDATE",
      routeId: "route-01",
      update,
    });
    expect(twice.notifications.filter((item) => item.id === "event-route-01:duplicate:1")).toHaveLength(1);
    expect(twice.handledEventKeys).toContain("route-01:duplicate:1");
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
    const simulation = state.simulations["route-01"];
    const offlineUpdate = setSimulationOffline(simulation, state.routes[0], now);
    const offlineState = appReducer(state, {
      type: "APPLY_SIMULATION_UPDATE",
      routeId: "route-01",
      update: offlineUpdate,
    });
    const staleState = {
      ...offlineState,
      currentTime: now + backendConfig.staleLocationSeconds * 1000 + 1000,
    };
    const snapshot = deriveRouteSnapshot(staleState, "route-01");
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
        routeId: "route-01",
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
        routeId: "route-01",
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
    expect(updatedRoute.shape).toHaveLength(updatedRoute.stops.filter((stop) => stop.lat != null).length);
    updatedRoute.stops.forEach((stop, index) => {
      if (stop.lat == null) expect(updatedRoute.stopIndices[index]).toBe(-1);
    });
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
