import { describe, expect, it } from "vitest";
import { GET as adminGet, POST as adminPost } from "@/app/api/admin/route";
import { GET as configGet } from "@/app/api/config/route";
import { GET as locationsGet, POST as locationsPost } from "@/app/api/locations/route";
import { POST as tripsPost } from "@/app/api/trips/route";
import { sampleRoutes } from "@/data/routes";
import { buildRouteGeometry } from "@/lib/geo";
import { validateGpsPoint, validateLocationTiming } from "@/lib/server/location";
import { adminMutationSchema, locationPayloadSchema } from "@/lib/validation";

const baseUrl = "http://localhost:3000";

function jsonRequest(path: string, body: unknown, token?: string) {
  return new Request(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("credential-free backend behavior", () => {
  it("reports server configuration without exposing secrets", async () => {
    const response = await configGet();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.serverConfigured).toBe(false);
    expect(body.demoMode).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/SERVICE_ROLE|serviceRoleKey|secret/i);
  });

  it("rejects GPS submissions without a token and reports demo mode when credentials are incomplete", async () => {
    const unauthenticated = await locationsPost(
      jsonRequest("/api/locations", {
        busId: "bus-sim01",
        tripId: "00000000-0000-4000-8000-000000000001",
        latitude: 17.3418,
        longitude: 78.368,
        recordedAt: new Date().toISOString(),
      }),
    );
    expect(unauthenticated.status).toBe(401);
    const unauthenticatedBody = await unauthenticated.json();
    expect(unauthenticatedBody.code).toBe("UNAUTHORIZED");

    const noBackend = await locationsPost(
      jsonRequest(
        "/api/locations",
        {
          busId: "bus-sim01",
          tripId: "00000000-0000-4000-8000-000000000001",
          latitude: 17.3418,
          longitude: 78.368,
          recordedAt: new Date().toISOString(),
        },
        "fake-token",
      ),
    );
    expect(noBackend.status).toBe(503);
    const demoBody = await noBackend.json();
    expect(demoBody.demoMode).toBe(true);
    expect(demoBody.code).toBe("DEMO_MODE");
  });

  it("protects trip, admin and location read endpoints from anonymous requests", async () => {
    const [tripResponse, adminMutation, adminRead, locationRead] = await Promise.all([
      tripsPost(jsonRequest("/api/trips", { action: "start", busId: "bus-sim01", routeId: "route-01" })),
      adminPost(jsonRequest("/api/admin", { resource: "buses", action: "create", data: {} })),
      adminGet(new Request(`${baseUrl}/api/admin`)),
      locationsGet(new Request(`${baseUrl}/api/locations?busId=bus-sim01`)),
    ]);
    expect(tripResponse.status).toBe(401);
    expect(adminMutation.status).toBe(401);
    expect((await adminRead.json()).demoMode).toBe(true);
    expect(adminRead.status).toBe(503);
    expect(locationRead.status).toBe(401);
  });
});

describe("GPS payload, timing and route validation", () => {
  const geometry = buildRouteGeometry(sampleRoutes[0]);
  const shape = geometry.points;

  it("rejects invalid coordinates, stale timestamps and future timestamps", () => {
    expect(
      locationPayloadSchema.safeParse({
        busId: "bus-sim01",
        tripId: "00000000-0000-4000-8000-000000000001",
        latitude: 200,
        longitude: 78.368,
        recordedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
    const now = Date.now();
    expect(validateLocationTiming(new Date(now - 120_000).toISOString(), now).valid).toBe(false);
    expect(validateLocationTiming(new Date(now + 60_000).toISOString(), now).valid).toBe(false);
    expect(validateLocationTiming(new Date(now - 5000).toISOString(), now).valid).toBe(true);
  });

  it("accepts a stop on the polyline and rejects an off-route point", () => {
    const firstStop = shape[0];
    expect(validateGpsPoint(firstStop.lat, firstStop.lng, shape).valid).toBe(true);
    const offRoute = validateGpsPoint(17.7, 78.8, shape);
    expect(offRoute.valid).toBe(false);
    expect(offRoute.error).toMatch(/route|service area/i);
  });

  it("whitelists admin resources and rejects unknown fields", () => {
    expect(
      adminMutationSchema.safeParse({
        resource: "bus_locations",
        action: "delete",
        id: "1",
      }).success,
    ).toBe(false);
    expect(
      adminMutationSchema.safeParse({
        resource: "buses",
        action: "delete",
        id: "bus-sim01",
        unexpected: true,
      }).success,
    ).toBe(false);
    expect(
      adminMutationSchema.safeParse({
        resource: "delay-reports",
        action: "create",
        data: { reason: "Traffic" },
      }).success,
    ).toBe(true);
  });
});
