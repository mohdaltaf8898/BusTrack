import { describe, expect, it } from "vitest";
import { sampleRoutes } from "@/data/routes";
import {
  calculateEtaSeconds,
  calculateStopEtas,
  getBusStatus,
  getTrafficCondition,
} from "@/lib/eta";
import {
  buildRouteGeometry,
  positionAtDistance,
  projectPointOnRoute,
} from "@/lib/geo";
import {
  advanceSimulation,
  createSimulationState,
  endDemoTrip,
  injectDelay,
  setSimulationOffline,
  startDemoTrip,
  togglePause,
} from "@/lib/simulation";
import type { SimulationState, TrafficCondition } from "@/lib/types";

const route = sampleRoutes[0];
const geometry = buildRouteGeometry(route);
const fixedTraffic: TrafficCondition = {
  label: "Light",
  factor: 1,
  description: "Fixed test traffic",
};
const selectedStopId = route.stops[2].id;
const now = 1_700_000_000_000;

function etasFor(simulation: SimulationState) {
  return calculateStopEtas({
    route,
    geometry,
    simulation,
    traffic: fixedTraffic,
    now,
    selectedStopId,
  });
}

describe("sample route geometry", () => {
  it("provides the 16 published routes with ordered mapped and unmapped stops", () => {
    expect(sampleRoutes).toHaveLength(16);
    for (const candidate of sampleRoutes) {
      const candidateGeometry = buildRouteGeometry(candidate);
      expect(candidate.scheduleYear).toBe("2025–26");
      expect(candidate.stops.length).toBeGreaterThanOrEqual(2);
      expect(candidateGeometry.stopDistances).toHaveLength(candidate.stops.length);
      expect(candidateGeometry.totalDistanceMeters).toBeGreaterThan(0);
      let previousDistance = -1;
      candidate.stops.forEach((stop, stopIndex) => {
        const distance = candidateGeometry.stopDistances[stopIndex];
        const shapeIndex = candidate.stopIndices[stopIndex];
        if (stop.lat == null || stop.lng == null) {
          expect(shapeIndex).toBe(-1);
          expect(distance).toBeNull();
          return;
        }
        expect(distance).not.toBeNull();
        expect(distance as number).toBeGreaterThanOrEqual(previousDistance);
        previousDistance = distance as number;
        const shapePoint = candidate.shape[shapeIndex];
        expect(shapePoint.lat).toBeCloseTo(stop.lat, 6);
        expect(shapePoint.lng).toBeCloseTo(stop.lng, 6);
      });
    }
  });

  it("starts a bus at the correct first stop", () => {
    const simulation = createSimulationState(route.id, now);
    const position = positionAtDistance(geometry, simulation.distanceMeters);
    expect(position.lat).toBeCloseTo(route.shape[0].lat, 6);
    expect(position.lng).toBeCloseTo(route.shape[0].lng, 6);
    expect(position.bearing).toBeGreaterThanOrEqual(0);
    expect(position.bearing).toBeLessThan(360);
  });
});

describe("simulation engine", () => {
  it("moves the bus along the route polyline without leaving it", () => {
    const started = startDemoTrip(createSimulationState(route.id, now), route, now);
    const advanced = advanceSimulation(started.state, {
      route,
      geometry,
      now: now + 10_000,
      deltaSeconds: 10,
      speedMultiplier: 8,
    });
    expect(started.events.some((event) => event.type === "trip_started")).toBe(true);
    expect(advanced.state.distanceMeters).toBeGreaterThan(0);
    expect(advanced.state.distanceMeters).toBeLessThanOrEqual(geometry.totalDistanceMeters);
    const position = positionAtDistance(geometry, advanced.state.distanceMeters);
    const projection = projectPointOnRoute(position, geometry);
    expect(projection.offRouteMeters).toBeLessThan(0.01);
  });

  it("recalculates ETA as distance decreases and never returns a negative ETA", () => {
    const atStart = createSimulationState(route.id, now, {
      tripStatus: "active",
      isRunning: true,
      isSharing: true,
    });
    const moved = advanceSimulation(atStart, {
      route,
      geometry,
      now: now + 20_000,
      deltaSeconds: 20,
      speedMultiplier: 8,
    });
    const before = etasFor(atStart);
    const after = etasFor(moved.state);
    expect(after.every((item) => item.etaSeconds == null || item.etaSeconds >= 0)).toBe(true);
    expect(after.every((item) => item.distanceMeters == null || item.distanceMeters >= 0)).toBe(true);
    const beforeSelected = before.find((item) => item.stop.id === selectedStopId);
    const afterSelected = after.find((item) => item.stop.id === selectedStopId);
    expect(beforeSelected).toBeDefined();
    expect(afterSelected).toBeDefined();
    expect(afterSelected!.etaSeconds).toBeLessThan(beforeSelected!.etaSeconds as number);
  });

  it("increases ETA when a simulated delay is injected", () => {
    const simulation = createSimulationState(route.id, now, {
      tripStatus: "active",
      isRunning: true,
      isSharing: true,
    });
    const before = etasFor(simulation).find((item) => item.stop.id === selectedStopId);
    const delayed = injectDelay(simulation, route, now);
    const after = etasFor(delayed.state).find((item) => item.stop.id === selectedStopId);
    expect(delayed.state.delaySeconds).toBe(300);
    expect(delayed.events[0].delaySeconds).toBe(300);
    expect(after!.etaSeconds).toBeGreaterThan(before!.etaSeconds as number);
    expect(calculateEtaSeconds(-100, 20, -50)).toBe(0);
  });

  it("simulates automatic traffic slowdowns at deterministic route thresholds", () => {
    const threshold = geometry.totalDistanceMeters * 0.35;
    const simulation = createSimulationState(route.id, now, {
      tripStatus: "active",
      isRunning: true,
      isSharing: true,
      distanceMeters: threshold - 5,
    });
    const advanced = advanceSimulation(simulation, {
      route,
      geometry,
      now: now + 1000,
      deltaSeconds: 1,
      speedMultiplier: 8,
    });
    expect(advanced.state.delaySeconds).toBeGreaterThanOrEqual(90);
    expect(advanced.events.some((event) => event.type === "delay")).toBe(true);
  });

  it("supports pause/resume and offline last-known state", () => {
    const started = startDemoTrip(createSimulationState(route.id, now), route, now);
    const paused = togglePause(started.state);
    expect(paused.state.isRunning).toBe(false);
    const frozen = advanceSimulation(paused.state, {
      route,
      geometry,
      now: now + 5000,
      deltaSeconds: 5,
      speedMultiplier: 8,
    });
    expect(frozen.state.distanceMeters).toBe(started.state.distanceMeters);
    expect(frozen.state.lastUpdateAt).toBe(started.state.lastUpdateAt);

    const resumed = togglePause(paused.state);
    expect(resumed.state.isRunning).toBe(true);
    const offline = setSimulationOffline(resumed.state, route, now + 6000);
    expect(offline.state.tripStatus).toBe("offline");
    expect(offline.state.isSharing).toBe(false);
    expect(offline.events.some((event) => event.type === "location_unavailable")).toBe(true);
    const status = getBusStatus({
      simulation: offline.state,
      traffic: getTrafficCondition(route, 0, 0),
      routeStatus: route.status,
      isStale: true,
    });
    expect(status).toBe("offline");
  });

  it("starts and ends a driver trip, stopping sharing at the end", () => {
    const idle = createSimulationState(route.id, now);
    const started = startDemoTrip(idle, route, now);
    expect(started.state.tripStatus).toBe("active");
    expect(started.state.isRunning).toBe(true);
    expect(started.state.isSharing).toBe(true);
    expect(started.state.startedAt).toBe(now);

    const ended = endDemoTrip(started.state, route, now + 60_000);
    expect(ended.state.tripStatus).toBe("completed");
    expect(ended.state.isRunning).toBe(false);
    expect(ended.state.isSharing).toBe(false);
    expect(ended.state.endedAt).toBe(now + 60_000);
    expect(ended.events.some((event) => event.type === "trip_completed")).toBe(true);
  });
});
