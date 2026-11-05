import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "@/lib/types";
import { signedInUser } from "./support/session";

const gate = vi.hoisted(() => ({
  state: {
    hydrated: true,
    authLoading: false,
    user: null as AppUser | null,
  },
  config: { unconfigured: false, publicConfigured: true },
}));

const navigation = vi.hoisted(() => ({ replace: vi.fn(), pathname: "/track" }));

vi.mock("@/state/app-provider", () => ({ useApp: () => gate }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

import { RequireAuth, isPublicPath } from "@/components/require-auth";

beforeEach(() => {
  gate.state = { hydrated: true, authLoading: false, user: null };
  gate.config = { unconfigured: false, publicConfigured: true };
  navigation.pathname = "/track";
  navigation.replace.mockClear();
});

describe("workspace access gate", () => {
  it("redirects a signed-out visitor to sign-in and keeps the intended path", async () => {
    render(<RequireAuth><div>Route details</div></RequireAuth>);
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/login?next=%2Ftrack"),
    );
    expect(screen.queryByText("Route details")).not.toBeInTheDocument();
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
  });

  it("renders the workspace for a signed-in user without redirecting", () => {
    gate.state.user = signedInUser("student");
    render(<RequireAuth><div>Route details</div></RequireAuth>);
    expect(screen.getByText("Route details")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("waits for hydration instead of flashing the gate", () => {
    gate.state = { hydrated: false, authLoading: true, user: null };
    render(<RequireAuth><div>Route details</div></RequireAuth>);
    expect(screen.getByLabelText("Loading BusTrack")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("explains a missing backend instead of looping through sign-in", () => {
    gate.config = { unconfigured: true, publicConfigured: false };
    render(<RequireAuth><div>Route details</div></RequireAuth>);
    expect(screen.getByText("BusTrack is not connected to a backend")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("treats only the introduction and account screens as public", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/auth/set-password")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/track")).toBe(false);
    expect(isPublicPath("/admin")).toBe(false);
    expect(isPublicPath("/driver")).toBe(false);
  });
});
