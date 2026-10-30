import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleRoutes } from "@/data/routes";

const server = vi.hoisted(() => ({ geometrySource: "straight", writes: 0 }));

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
            insert(value: Record<string, unknown>) {
              server.writes += 1;
              return { select: () => ({ single: async () => ({ data: { id: 1, ...value }, error: null }) }) };
            },
            update() { return { eq: async () => ({ error: null }) }; },
          };
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

beforeEach(() => { server.geometrySource = "straight"; server.writes = 0; });

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
  });

  it("still rejects off-route points even for a verified route", async () => {
    server.geometrySource = "verified";
    const result = await locationPost(locationRequest(17.7, 78.8));
    expect(result.status).toBe(422);
    expect((await result.json()).code).toBe("OFF_ROUTE");
    expect(server.writes).toBe(0);
  });
});
