import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as roadRouteGet } from "@/app/api/road-route/route";
import { sampleRoutes } from "@/data/routes";
import { appReducer, createInitialState } from "@/lib/app-reducer";
import { buildRouteGeometry, positionAtDistance, projectPointOnRoute } from "@/lib/geo";
import { roadGeometryFromOsrm, routeCoordinateKey, type RoadGeometry } from "@/lib/road-routing";

const route = sampleRoutes[0];
const mapped = route.stops.filter((stop) => stop.lat != null && stop.lng != null);
function responsePayload() {
  return {
    code: "Ok",
    routes: [{ geometry: { coordinates: route.shape.map((point) => [point.lng, point.lat]) } }],
    waypoints: mapped.map((stop) => ({ location: [stop.lng, stop.lat], distance: 0 })),
  };
}

function request(id: string, ip: string) {
  return new Request(`http://localhost/api/road-route?routeId=${id}`, { headers: { "x-forwarded-for": ip } });
}

afterEach(() => vi.unstubAllGlobals());

describe("road-aligned geometry", () => {
  it("maps snapped road waypoints in order while keeping unmapped stops unset", () => {
    const result = roadGeometryFromOsrm(route, responsePayload());
    expect(result.coordinateKey).toBe(routeCoordinateKey(route));
    expect(result.stopIndices).toEqual(route.stopIndices);
    expect(result.stopIndices[3]).toBe(-1);
    expect(result.shape.length).toBe(route.shape.length);
  });

  it("rejects invalid road coordinates, missing waypoints and distant snapping", () => {
    const missing = responsePayload();
    missing.waypoints.pop();
    expect(() => roadGeometryFromOsrm(route, missing)).toThrow(/incomplete/);
    const invalid = responsePayload();
    invalid.routes[0].geometry.coordinates[0] = [0, 0];
    expect(() => roadGeometryFromOsrm(route, invalid)).toThrow(/invalid coordinates/);
    const far = responsePayload();
    far.waypoints[0].location = [78.7, 17.6];
    expect(() => roadGeometryFromOsrm(route, far)).toThrow(/nearby road/);
  });

  it("allows only fixed catalogue routes and provides a labelled failure response", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network unavailable"));
    vi.stubGlobal("fetch", fetchMock);
    const unknown = await roadRouteGet(request("https://attacker.invalid", "test-ip-a"));
    expect(unknown.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    const fallback = await roadRouteGet(request(route.id, "test-ip-b"));
    expect(fallback.status).toBe(503);
    expect((await fallback.json()).error).toMatch(/straight-line preview/i);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^https:\/\/router\.project-osrm\.org\/route\/v1\/driving\//);
  });

  it("returns validated cached geometry when the router succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(responsePayload()), { status: 200 })));
    const result = await roadRouteGet(request(route.id, "test-ip-c"));
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toContain("s-maxage=86400");
    const body = await result.json();
    expect(body.stopIndices).toEqual(route.stopIndices);
    expect(body.coordinateKey).toBe(routeCoordinateKey(route));
  });

  it("never overwrites a stop edit or verified geometry, and keeps simulated movement on the new path", () => {
    const initial = createInitialState(1000);
    const originalLength = buildRouteGeometry(route).totalDistanceMeters;
    initial.simulations[route.id].distanceMeters = originalLength / 2;
    const geometry: RoadGeometry = {
      coordinateKey: routeCoordinateKey(route),
      shape: [route.shape[0], { lat: 17.40, lng: 78.44 }, ...route.shape.slice(1)],
      stopIndices: route.stopIndices.map((index) => index < 0 ? -1 : index === 0 ? 0 : index + 1),
    };
    const updated = appReducer(initial, { type: "SET_ROAD_GEOMETRY", routeId: route.id, geometry });
    const updatedRoute = updated.routes[0];
    const updatedGeometry = buildRouteGeometry(updatedRoute);
    expect(updatedRoute.geometrySource).toBe("road");
    expect(updated.simulations[route.id].distanceMeters / updatedGeometry.totalDistanceMeters).toBeCloseTo(0.5, 5);
    const position = positionAtDistance(updatedGeometry, updated.simulations[route.id].distanceMeters);
    expect(projectPointOnRoute(position, updatedGeometry).offRouteMeters).toBeLessThan(0.01);

    const editedRoute = { ...route, stops: route.stops.map((stop, index) => index === 0 ? { ...stop, lat: 17.5 } : stop) };
    const edited = { ...initial, routes: [editedRoute, ...initial.routes.slice(1)] };
    expect(appReducer(edited, { type: "SET_ROAD_GEOMETRY", routeId: route.id, geometry })).toBe(edited);
    const verified = { ...initial, routes: [{ ...route, geometrySource: "verified" as const }, ...initial.routes.slice(1)] };
    expect(appReducer(verified, { type: "SET_ROAD_GEOMETRY", routeId: route.id, geometry })).toBe(verified);
  });
});
