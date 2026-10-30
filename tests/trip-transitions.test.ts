import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  role: "driver",
  tripStatus: "active",
  updateMissing: false,
  conditions: [] as Array<[string, unknown]>,
  patch: {} as Record<string, unknown>,
}));

vi.mock("@/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/auth")>();
  return {
    ...actual,
    requireApiUser: vi.fn(async () => ({
      user: { id: "driver-1" }, profile: { role: mock.role },
      client: { from: () => {
        let updating = false;
        const builder = {
          select: () => builder,
          update: (patch: Record<string, unknown>) => { updating = true; mock.patch = patch; return builder; },
          eq: (field: string, value: unknown) => { if (updating) mock.conditions.push([field, value]); return builder; },
          maybeSingle: async () => ({
            data: updating && mock.updateMissing ? null : {
              id: "20000000-0000-4000-8000-000000000001", driver_id: "driver-1",
              status: mock.tripStatus, sharing_enabled: true, ...mock.patch,
            }, error: null,
          }),
        };
        return builder;
      } },
    })),
  };
});

import { POST } from "@/app/api/trips/route";

function request(action: "share" | "end") {
  return new Request("http://localhost/api/trips", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
    body: JSON.stringify({ action, tripId: "20000000-0000-4000-8000-000000000001", ...(action === "share" ? { enabled: true } : {}) }),
  });
}

beforeEach(() => {
  mock.role = "driver";
  mock.tripStatus = "active";
  mock.updateMissing = false;
  mock.conditions = [];
  mock.patch = {};
});

describe("trip transition race guards", () => {
  it.each(["share", "end"] as const)("conditions %s on the trip still being active and assigned", async (action) => {
    expect((await POST(request(action))).status).toBe(200);
    expect(mock.conditions).toContainEqual(["status", "active"]);
    expect(mock.conditions).toContainEqual(["driver_id", "driver-1"]);
  });

  it.each(["share", "end"] as const)("returns a conflict when %s loses a race with another transition", async (action) => {
    mock.updateMissing = true;
    const response = await POST(request(action));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("TRIP_CHANGED");
  });
});
