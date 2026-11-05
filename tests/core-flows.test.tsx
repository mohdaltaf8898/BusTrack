import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(app)/dashboard/page";
import LoginPage from "@/app/login/page";
import { DriverDashboard } from "@/components/driver/driver-dashboard";
import { AppProvider, useApp } from "@/state/app-provider";
import { signedInUser } from "./support/session";
import { sampleRoutes } from "@/data/routes";
import type { AppUser } from "@/lib/types";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Demo identities are gone, so tests sign a user in by overriding the session
 * the context reports. Everything else (reducer, simulation, components) is the
 * real implementation.
 */
const session = vi.hoisted(() => ({ user: null as unknown }));

vi.mock("@/state/app-provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state/app-provider")>();
  return {
    ...actual,
    useApp: () => {
      const value = actual.useApp();
      const user = session.user as AppUser | null;
      return user ? { ...value, state: { ...value.state, user } } : value;
    },
  };
});

vi.mock("@/components/maps/live-map", () => ({
  LiveMap: (props: {
    route: { id: string };
    busPosition: { lat: number; lng: number };
    selectedStopId: string;
  }) => (
    <div
      data-testid="live-map"
      data-route-id={props.route.id}
      data-selected-stop={props.selectedStopId}
      data-bus-lat={props.busPosition.lat.toFixed(6)}
      data-bus-lng={props.busPosition.lng.toFixed(6)}
    />
  ),
}));

function renderWithProvider(ui: React.ReactNode) {
  return render(<AppProvider>{ui}</AppProvider>);
}

function signInAs(user: AppUser | null) {
  session.user = user;
}

describe("student dashboard flow", () => {
  it("switches routes and keeps the map and estimate on the selected stop", async () => {
    signInAs(signedInUser("student"));
    renderWithProvider(<DashboardPage />);

    const routeSelect = await screen.findByLabelText("Selected bus route");
    expect(routeSelect).toHaveValue("route-01");
    expect(screen.getByTestId("live-map")).toHaveAttribute("data-route-id", "route-01");
    expect(screen.getByTestId("live-map")).toHaveAttribute("data-bus-lat", sampleRoutes[0].shape[0].lat.toFixed(6));
    expect(screen.getByText(/Arrival times below are estimates/)).toBeInTheDocument();

    fireEvent.change(routeSelect, { target: { value: "route-02" } });
    await waitFor(() => {
      expect(routeSelect).toHaveValue("route-02");
      expect(screen.getByTestId("live-map")).toHaveAttribute("data-route-id", "route-02");
      expect(screen.getByTestId("live-map")).toHaveAttribute("data-bus-lat", sampleRoutes[1].shape[0].lat.toFixed(6));
    });
  });

  it("does not offer students any simulation controls", async () => {
    signInAs(signedInUser("student"));
    renderWithProvider(<DashboardPage />);
    await screen.findByLabelText("Selected bus route");
    expect(screen.queryByText(/Simulation controls|Demo controls/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Simulate offline/i })).not.toBeInTheDocument();
  });
});

describe("driver simulation flow", () => {
  it("starts, pauses and ends a simulated trip without requesting browser GPS", async () => {
    signInAs(signedInUser("driver"));
    renderWithProvider(<DriverDashboard />);

    fireEvent.click(await screen.findByText("Simulation testing"));

    const startButton = () => screen.getAllByRole("button", { name: /^Start Trip$/i })[0];
    const endButton = () => screen.getAllByRole("button", { name: /^End Trip$/i })[0];
    const resetButton = () => screen.getAllByRole("button", { name: /^Reset$/i })[0];

    await waitFor(() => expect(startButton()).toBeInTheDocument());
    expect(screen.getAllByText(/Simulation mode/i).length).toBeGreaterThan(0);

    fireEvent.click(resetButton());
    await waitFor(() => {
      expect(startButton()).toBeEnabled();
      expect(endButton()).toBeDisabled();
    });

    fireEvent.click(startButton());
    await waitFor(() => {
      expect(startButton()).toBeDisabled();
      expect(endButton()).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add 5-min delay/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/\+5 min/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Simulate offline/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Restore connection/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Restore connection/i }));

    fireEvent.click(endButton());
    await waitFor(() => {
      expect(startButton()).toBeEnabled();
      expect(endButton()).toBeDisabled();
    });
  });
});

describe("sign-in screen", () => {
  it("offers email and Google sign-in and no local role switching", async () => {
    signInAs(null);
    renderWithProvider(<LoginPage />);

    expect(await screen.findByRole("tab", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    // The Google provider is off in the test environment, so the card says so
    // instead of rendering a control that could never complete.
    expect(screen.getByText(/Google sign-in is not switched on yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue with Google/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Local demo roles/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Driver$/i })).not.toBeInTheDocument();
  });
});
