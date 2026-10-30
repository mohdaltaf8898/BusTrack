import { beforeEach, describe, expect, it, vi } from "vitest";

const backend = vi.hoisted(() => ({
  role: "student",
  locationAgeMs: 1_000,
  status: "active",
  sharing: true,
  endedAgeMs: 0,
}));

vi.mock("@/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/auth")>();
  return {
    ...actual,
    requireApiUser: vi.fn(async () => ({
      profile: { role: backend.role },
      client: {
        from(table: string) {
          return {
            select() {
              if (table === "bus_locations") {
                return { eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({
                  data: {
                    id: 1, bus_id: "bus-sim01", route_id: "route-01", trip_id: "trip-1",
                    latitude: 17.34, longitude: 78.37, heading: null, speed_kmh: null,
                    accuracy_meters: null, source: "gps", recorded_at: new Date(Date.now() - backend.locationAgeMs).toISOString(),
                  }, error: null,
                }) }) }) }) };
              }
              return { eq: () => ({ maybeSingle: async () => ({
                data: { id: "trip-1", status: backend.status, sharing_enabled: backend.sharing,
                  ended_at: new Date(Date.now() - backend.endedAgeMs).toISOString() },
                error: null,
              }) }) };
            },
          };
        },
      },
    })),
  };
});

import { GET } from "@/app/api/locations/route";

function request() {
  return new Request("http://localhost/api/locations?busId=bus-sim01", { headers: { Authorization: "Bearer test-token" } });
}

beforeEach(() => Object.assign(backend, {
  role: "student", locationAgeMs: 1_000, status: "active", sharing: true, endedAgeMs: 0,
}));

describe("location read privacy and live status", () => {
  it("marks an active sharing trip live, but a stopped sharing trip last-known", async () => {
    expect((await (await GET(request())).json()).live).toBe(true);
    backend.sharing = false;
    const body = await (await GET(request())).json();
    expect(body.live).toBe(false);
    expect(body.location.bus_id).toBe("bus-sim01");
  });

  it("hides positions older than 15 minutes or from a long-completed trip", async () => {
    backend.locationAgeMs = 15 * 60_000 + 1;
    expect((await (await GET(request())).json()).location).toBeNull();
    backend.locationAgeMs = 1_000;
    backend.status = "completed";
    backend.endedAgeMs = 15 * 60_000 + 1;
    expect((await (await GET(request())).json()).location).toBeNull();
    backend.endedAgeMs = 1_000;
    const recent = await (await GET(request())).json();
    expect(recent.location).not.toBeNull();
    expect(recent.live).toBe(false);
  });

  it("allows an administrator to inspect an older position without claiming it is live", async () => {
    backend.role = "admin";
    backend.status = "completed";
    backend.locationAgeMs = 60 * 60_000;
    const body = await (await GET(request())).json();
    expect(body.location).not.toBeNull();
    expect(body.live).toBe(false);
  });
});
