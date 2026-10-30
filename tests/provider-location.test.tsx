import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const realtime = vi.hoisted(() => ({
  role: "student",
  location: undefined as undefined | ((payload: { new: { bus_id: string } }) => void),
}));

vi.mock("@/lib/config", () => ({
  isSupabaseConfigured: true,
  publicSupabaseConfig: { url: "https://example.supabase.co", anonKey: "public-test-key" },
  backendConfig: {
    enabled: true, demoMode: false, publicConfigured: true, serverConfigured: true,
    realtimeConfigured: true, simulationSpeedMultiplier: 8, staleLocationSeconds: 45,
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      initialize: async () => ({ error: null }),
      getSession: async () => ({ data: { session: { access_token: "test-token", user: { id: "student-1", email: "student@example.edu" } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "student-1", name: "Student", role: realtime.role }, error: null }) }) }) }),
    channel: () => {
      const channel = {
        on: (_event: string, filter: { table: string }, callback: (payload: { new: { bus_id: string } }) => void) => {
          if (filter.table === "bus_locations") realtime.location = callback;
          return channel;
        },
        subscribe: (callback?: (status: string) => void) => { callback?.("SUBSCRIBED"); return channel; },
      };
      return channel;
    },
    removeChannel: async () => {},
  }),
}));

import { AppProvider, useApp } from "@/state/app-provider";

function LocationInspector() {
  const { state, snapshot, setDemoRole } = useApp();
  return <>
    <div data-testid="provider">{state.user?.provider ?? "none"}</div>
    <div data-testid="mode">{snapshot.dataMode}</div>
    <div data-testid="drivers">{state.drivers.map((driver) => driver.name).join(", ")}</div>
    <button onClick={() => setDemoRole("student")}>Switch to demo</button>
  </>;
}

afterEach(() => {
  realtime.location = undefined;
  realtime.role = "student";
  vi.unstubAllGlobals();
});

describe("provider location refresh", () => {
  it("rechecks the backend for a Realtime INSERT and clears data on demo-role switch", async () => {
    let live = true;
    let locationReads = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/locations")) {
        locationReads += 1;
        expect(init?.headers).toEqual({ Authorization: "Bearer test-token" });
        return Response.json({
          location: {
            bus_id: "bus-sim01", route_id: "route-01", latitude: 17.389948, longitude: 78.451726,
            recorded_at: new Date().toISOString(), source: "gps",
          },
          live,
        });
      }
      if (url === "/api/admin") return Response.json({
        data: { routes: [], stops: [], buses: [{ id: "bus-sim01", bus_number: "SIM-01", assigned_route_id: "route-01" }], drivers: [] },
      });
      if (url === "/api/config") return Response.json({ serverConfigured: true, demoMode: false });
      return new Response(null, { status: 503 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AppProvider><LocationInspector /></AppProvider>);

    await waitFor(() => expect(screen.getByTestId("provider")).toHaveTextContent("supabase"));
    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("live"));
    expect(realtime.location).toBeTypeOf("function");
    const before = locationReads;
    live = false;
    act(() => realtime.location?.({ new: { bus_id: "bus-sim01" } }));
    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("last-known"));
    expect(locationReads).toBeGreaterThan(before);

    fireEvent.click(screen.getByRole("button", { name: "Switch to demo" }));
    await waitFor(() => expect(screen.getByTestId("provider")).toHaveTextContent("demo"));
    expect(screen.getByTestId("mode")).toHaveTextContent("simulation");
    const afterSwitch = locationReads;
    act(() => realtime.location?.({ new: { bus_id: "bus-sim01" } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(locationReads).toBe(afterSwitch);
    expect(screen.getByTestId("mode")).toHaveTextContent("simulation");
  });

  it("does not reapply an admin response or send the admin token after switching to demo", async () => {
    realtime.role = "admin";
    let resolveAdmin!: (response: Response) => void;
    const pendingAdmin = new Promise<Response>((resolve) => { resolveAdmin = resolve; });
    let adminRequested = false;
    let publicReads = 0;
    const publicData = { routes: [], stops: [], buses: [{ id: "bus-sim01", bus_number: "SIM-01", assigned_route_id: "route-01" }], drivers: [] };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/admin") {
        if (init?.headers) { adminRequested = true; return pendingAdmin; }
        publicReads += 1;
        return Response.json({ data: publicData });
      }
      if (url.startsWith("/api/locations")) return Response.json({ location: null, live: false });
      if (url === "/api/config") return Response.json({ serverConfigured: true, demoMode: false });
      return new Response(null, { status: 503 });
    }));
    render(<AppProvider><LocationInspector /></AppProvider>);
    await waitFor(() => expect(adminRequested).toBe(true));
    const publicBeforeSwitch = publicReads;
    fireEvent.click(screen.getByRole("button", { name: "Switch to demo" }));
    await waitFor(() => expect(screen.getByTestId("provider")).toHaveTextContent("demo"));
    await waitFor(() => expect(publicReads).toBeGreaterThan(publicBeforeSwitch));
    await act(async () => {
      resolveAdmin(Response.json({ data: { ...publicData, drivers: [{ id: "driver-1", name: "Private driver" }] } }));
      await pendingAdmin;
    });
    expect(screen.getByTestId("drivers")).not.toHaveTextContent("Private driver");
  });
});
