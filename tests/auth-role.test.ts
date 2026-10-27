import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => {
  const maybeSingle = vi.fn(async () => ({
    data: { id: "student-user", name: "Test Student", role: "student" },
    error: null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const getUser = vi.fn(async () => ({
    data: { user: { id: "student-user" } },
    error: null,
  }));
  return {
    createClient: vi.fn(() => ({ auth: { getUser }, from })),
  };
});

describe("server-side role authorization", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a student token for driver/admin GPS and trip actions", async () => {
    vi.resetModules();
    const { requireApiUser } = await import("@/lib/server/auth");
    const request = new Request("http://localhost:3000/api/locations", {
      headers: { Authorization: "Bearer student-access-token" },
    });
    await expect(requireApiUser(request, ["driver", "admin"])).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});
