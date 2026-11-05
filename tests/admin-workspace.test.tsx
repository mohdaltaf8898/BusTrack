import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/lib/types";

const backend = vi.hoisted(() => ({
  role: "admin" as UserRole,
  posts: [] as Array<{ url: string; body: unknown; headers?: HeadersInit }>,
}));

vi.mock("@/lib/config", () => ({
  isSupabaseConfigured: true,
  publicSupabaseConfig: { url: "https://example.supabase.co", anonKey: "public-test-key" },
  backendConfig: {
    enabled: true, unconfigured: false, publicConfigured: true, serverConfigured: true,
    realtimeConfigured: true, simulationSpeedMultiplier: 8, staleLocationSeconds: 45,
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      initialize: async () => ({ error: null }),
      getSession: async () => ({
        data: { session: { access_token: "admin-token", user: { id: "admin-1", email: "admin@example.edu" } } },
        error: null,
      }),
      getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "admin-1", name: "Transport Admin", role: backend.role },
            error: null,
          }),
        }),
      }),
    }),
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: async () => {},
  }),
}));

import { AppProvider } from "@/state/app-provider";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import AdminPage from "@/app/(app)/admin/page";

const catalog = {
  routes: [],
  stops: [],
  buses: [{ id: "bus-sim01", bus_number: "SIM-01", assigned_route_id: "route-01" }],
  drivers: [],
};

afterEach(() => {
  backend.role = "admin";
  backend.posts = [];
  vi.unstubAllGlobals();
});

function installFetch() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/config") return Response.json({ serverConfigured: true, unconfigured: false });
    if (url.startsWith("/api/locations")) return Response.json({ location: null, live: false });
    if (url === "/api/admin") {
      if (init?.method === "POST") {
        backend.posts.push({ url, body: JSON.parse(String(init.body)), headers: init.headers });
        return Response.json({ ok: true });
      }
      return Response.json({ data: catalog });
    }
    return new Response(null, { status: 503 });
  }));
}

describe("administrator workspace behind sign-in", () => {
  it("sends a validated bus through the authenticated API", async () => {
    installFetch();
    render(<AppProvider><AdminDashboard /></AppProvider>);

    const addButtons = await screen.findAllByRole("button", { name: /^Add bus$/i });
    fireEvent.click(addButtons[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Bus number"), {
      target: { value: "BT-UI-01" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Add bus$/i }));

    await waitFor(() => expect(backend.posts).toHaveLength(1));
    const post = backend.posts[0];
    expect(post.body).toMatchObject({ resource: "buses", action: "create" });
    expect((post.body as { data: { number: string } }).data.number).toBe("BT-UI-01");
    expect((post.headers as Record<string, string>).Authorization).toBe("Bearer admin-token");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("refuses a non-administrator before rendering any admin tooling", async () => {
    backend.role = "student";
    installFetch();
    await act(async () => {
      render(<AppProvider><AdminPage /></AppProvider>);
    });

    expect(await screen.findByText(/Restricted area/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Add bus$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue as demo admin/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to sign in/i })).toHaveAttribute("href", "/login");
  });
});
