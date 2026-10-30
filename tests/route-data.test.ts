import { describe, expect, it } from "vitest";
import timetable from "@/data/lords-routes-2025-26.json";
import { sampleRoutes } from "@/data/routes";
import { mapBackendData } from "@/lib/backend-mapping";
import { calculateStopEtas } from "@/lib/eta";
import { buildRouteGeometry } from "@/lib/geo";
import { advanceSimulation, createSimulationState } from "@/lib/simulation";

describe("historical timetable", () => {
  it("keeps published order and missing times without inventing coordinates", () => {
    expect(timetable).toHaveLength(16);
    for (const [index, entry] of timetable.entries()) {
      const route = sampleRoutes[index];
      expect(route.id).toBe(`route-${String(entry.number).padStart(2, "0")}`);
      expect(route.scheduleYear).toBe("2025–26");
      expect(route.stops.map((stop) => [stop.name, stop.scheduledTime])).toEqual(
        entry.stops.map((stop) => [stop.name, stop.scheduledTime]),
      );
      for (const [stopIndex, stop] of entry.stops.entries()) {
        if (stop.location == null) {
          expect(route.stops[stopIndex].lat).toBeNull();
          expect(route.stops[stopIndex].lng).toBeNull();
          expect(route.stopIndices[stopIndex]).toBe(-1);
        }
      }
    }
    const ambiguous = sampleRoutes[9].stops.find((stop) => stop.name === "College");
    expect(ambiguous).toMatchObject({ scheduledTime: "08:32", lat: null, lng: null });
    expect(ambiguous?.note).toMatch(/ambiguous|unclear/i);
    const inferred = sampleRoutes[10].stops.at(-1);
    expect(inferred?.scheduledTime).toBeNull();
    expect(inferred?.note).toMatch(/inferred|older/i);
  });

  it("does not generate ETAs or arrival notifications for unlocated stops", () => {
    const route = sampleRoutes[0];
    const geometry = buildRouteGeometry(route);
    const state = createSimulationState(route.id, 0, { tripStatus: "active", isRunning: true, isSharing: true });
    const stopEtas = calculateStopEtas({
      route, geometry, simulation: state, now: 0, selectedStopId: route.stops[3].id,
      traffic: { label: "Light", factor: 1, description: "test" },
    });
    expect(stopEtas[3]).toMatchObject({ status: "unmapped", etaAt: null, etaSeconds: null, distanceMeters: null });
    const result = advanceSimulation(state, {
      route, geometry, now: 1000, deltaSeconds: 5, speedMultiplier: 10000,
    });
    const unmappedIds = new Set(route.stops.filter((stop) => stop.lat == null).map((stop) => stop.id));
    expect(result.events.some((event) => event.stopId && unmappedIds.has(event.stopId))).toBe(false);
  });

  it("keeps nullable stop positions, provenance and timetable fields from Supabase", () => {
    const route = sampleRoutes[0];
    const mapped = mapBackendData({
      routes: [{
        id: route.id, code: route.code, route_name: route.name,
        start_location: route.startLocation, destination: route.destination,
        shape: route.shape, stop_indices: route.stopIndices, geometry_source: "verified",
        schedule_year: "2025–26", scheduled_duration_minutes: 35,
      }],
      stops: route.stops.map((stop) => ({
        id: stop.id, route_id: route.id, stop_name: stop.name,
        latitude: stop.lat, longitude: stop.lng, stop_order: stop.order,
        scheduled_time: stop.scheduledTime, location_source: stop.locationSource,
        location_reference: stop.locationReference, note: stop.note,
      })),
      buses: [{ id: "sim", bus_number: "SIM-01", assigned_route_id: route.id, capacity: null }],
    }, 0);
    expect(mapped.routes[0].stops[3]).toMatchObject({ lat: null, lng: null, scheduledTime: "08:47" });
    expect(mapped.routes[0].stopIndices[3]).toBe(-1);
    expect(mapped.routes[0]).toMatchObject({ geometrySource: "verified", scheduleYear: "2025–26", scheduledDurationMinutes: 35 });
    expect(mapped.buses[0].capacity).toBeNull();
  });
});
