import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const account = vi.hoisted(() => ({
  session: null as null | { access_token: string; user: { id: string; email: string } },
  signUp: vi.fn(async (_input: unknown) => ({ data: { session: null, user: null }, error: null })),
  reset: vi.fn(async (_email: string, _options: unknown) => ({ error: null })),
  getUser: vi.fn(async (_token: string) => ({ data: { user: { id: "student-1" } }, error: null })),
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
      getSession: async () => ({ data: { session: account.session }, error: null }),
      getUser: account.getUser,
      signUp: account.signUp,
      resetPasswordForEmail: account.reset,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "student-1", name: "Student", role: "student" }, error: null }) }) }) }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: async () => {},
  }),
}));

import { AppProvider, useApp } from "@/state/app-provider";

function AuthInspector() {
  const { state, signUp, requestPasswordReset, updatePassword } = useApp();
  return <>
    <div data-testid="auth-loading">{state.authLoading ? "loading" : "ready"}</div>
    <div data-testid="role">{state.user?.role ?? "none"}</div>
    <button onClick={() => void signUp("Student", "student@example.edu", "my-password")}>Register</button>
    <button onClick={() => void requestPasswordReset("student@example.edu")}>Recover</button>
    <button onClick={() => void updatePassword("my-new-password")}>Update</button>
  </>;
}

afterEach(() => {
  account.session = null;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("provider account actions", () => {
  function setup() {
    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
      if (String(url) === "/api/admin") return Response.json({ data: { routes: [], stops: [], buses: [], drivers: [] } });
      if (String(url).startsWith("/api/locations")) return Response.json({ location: null, live: false });
      return Response.json({});
    }));
    render(<AppProvider><AuthInspector /></AppProvider>);
  }

  it("registers only as a student and uses a same-site confirmation redirect", async () => {
    setup();
    await waitFor(() => expect(screen.getByTestId("auth-loading")).toHaveTextContent("ready"));
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    await waitFor(() => expect(account.signUp).toHaveBeenCalledOnce());
    expect(account.signUp).toHaveBeenCalledWith({
      email: "student@example.edu", password: "my-password",
      options: { data: { name: "Student" }, emailRedirectTo: "http://localhost:3000/login" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Recover" }));
    await waitFor(() => expect(account.reset).toHaveBeenCalledWith("student@example.edu", {
      redirectTo: "http://localhost:3000/auth/set-password",
    }));
  });

  it("verifies the current user before sending a password change with a captured token", async () => {
    account.session = { access_token: "student-session-token", user: { id: "student-1", email: "student@example.edu" } };
    setup();
    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("student"));
    const fetchMock = vi.mocked(fetch);
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(account.getUser).toHaveBeenCalledWith("student-session-token"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(new URL("https://example.supabase.co/auth/v1/user"), expect.objectContaining({
      method: "PUT", headers: expect.objectContaining({ Authorization: "Bearer student-session-token" }),
    })));
  });
});
