import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleRoutes } from "@/data/routes";

const server = vi.hoisted(() => ({
  geometrySource: "straight",
  writes: 0,
  rpcError: null as null | { code: string; message: string },
  rpcArgs: null as null | Record<string, unknown>,
}));

vi.mock("@/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/auth")>();
  return {
    ...actual,
    requireApiUser: vi.fn(async () => {
      const route = (await import("@/data/routes")).sampleRoutes[0];
      const client = {
        from(table: string) {
          return {
            select() {
              return { eq: () => ({ maybeSingle: async () => ({
                data: table === "trips"
                  ? { id: "10000000-0000-4000-8000-000000000001", bus_id: "bus-sim01", route_id: route.id, driver_id: "driver-1", status: "active", sharing_enabled: true }
                  : table === "buses"
                    ? { id: "bus-sim01", driver_id: "driver-1", assigned_route_id: route.id }
                    : { id: route.id, shape: route.shape, geometry_source: server.geometrySource },
                error: null,
              }) }) };
            },
          };
        },
        rpc(name: string, value: Record<string, unknown>) {
          if (name !== "insert_guarded_bus_location") throw new Error("Unexpected GPS RPC");
          server.rpcArgs = value;
          return { single: async () => {
            if (server.rpcError) return { data: null, error: server.rpcError };
            server.writes += 1;
            return { data: {
              id: 1, bus_id: value.p_bus_id, route_id: value.p_expected_route_id, trip_id: value.p_trip_id,
              latitude: value.p_latitude, longitude: value.p_longitude, recorded_at: value.p_recorded_at,
              source: "gps", heading: null, speed_kmh: null, accuracy_meters: null,
            }, error: null };
          } };
        },
      };
      return { user: { id: "driver-1" }, profile: { role: "driver" }, client };
    }),
  };
});

import { POST as locationPost } from "@/app/api/locations/route";

function locationRequest(latitude = sampleRoutes[0].shape[0].lat, longitude = sampleRoutes[0].shape[0].lng) {
  return new Request("http://localhost/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
    body: JSON.stringify({
      busId: "bus-sim01", tripId: "10000000-0000-4000-8000-000000000001",
      latitude, longitude, recordedAt: new Date().toISOString(),
    }),
  });
}

beforeEach(() => {
  server.geometrySource = "straight";
  server.writes = 0;
  server.rpcError = null;
  server.rpcArgs = null;
});

describe("real GPS corridor gate", () => {
  it("rejects straight and inferred road paths before writing GPS", async () => {
    for (const source of ["straight", "road"]) {
      server.geometrySource = source;
      const result = await locationPost(locationRequest());
      expect(result.status).toBe(409);
      expect((await result.json()).code).toBe("ROUTE_NOT_VERIFIED");
      expect(server.writes).toBe(0);
    }
  });

  it("accepts an assigned driver's on-corridor point only after verification", async () => {
    server.geometrySource = "verified";
    const result = await locationPost(locationRequest());
    expect(result.status).toBe(201);
    expect((await result.json()).mode).toBe("gps");
    expect(server.writes).toBe(1);
    expect(server.rpcArgs).toMatchObject({
      p_actor_id: "driver-1", p_bus_id: "bus-sim01", p_expected_route_id: "route-01",
      p_expected_shape: sampleRoutes[0].shape,
    });
  });

  it.each([
    ["SHARING_DISABLED", 409], ["ROUTE_CHANGED", 409], ["NOT_ASSIGNED", 403],
    ["FORBIDDEN", 403], ["STALE_LOCATION", 422], ["ROUTE_NOT_VERIFIED", 409],
  ])("safely maps a transactional %s rejection", async (code, status) => {
    server.geometrySource = "verified";
    server.rpcError = { code: "P0001", message: code };
    const result = await locationPost(locationRequest());
    expect(result.status).toBe(status);
    expect((await result.json()).code).toBe(code);
    expect(server.writes).toBe(0);
  });

  it("does not expose unexpected database errors", async () => {
    server.geometrySource = "verified";
    server.rpcError = { code: "XX000", message: "private database detail" };
    const result = await locationPost(locationRequest());
    expect(result.status).toBe(500);
    expect(JSON.stringify(await result.json())).not.toContain("private database detail");
  });

  it("still rejects off-route points even for a verified route", async () => {
    server.geometrySource = "verified";
    const result = await locationPost(locationRequest(17.7, 78.8));
    expect(result.status).toBe(422);
    expect((await result.json()).code).toBe("OFF_ROUTE");
    expect(server.writes).toBe(0);
  });
});
