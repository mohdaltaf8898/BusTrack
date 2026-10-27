import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/page";
import LoginPage from "@/app/login/page";
import { DriverDashboard } from "@/components/driver/driver-dashboard";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AppProvider, useApp } from "@/state/app-provider";
import type { UserRole } from "@/lib/types";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock }),
}));

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

function RoleButton({ role }: { role: UserRole }) {
  const { setDemoRole } = useApp();
  return (
    <button type="button" onClick={() => setDemoRole(role)}>
      Set {role} role
    </button>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe("student dashboard flow", () => {
  it("switches routes, injects a delay, goes offline, and ends a trip from the UI", async () => {
    renderWithProvider(<DashboardPage />);

    const routeSelect = await screen.findByLabelText("Selected bus route");
    expect(routeSelect).toHaveValue("route-a");
    expect(screen.getByTestId("live-map")).toHaveAttribute("data-route-id", "route-a");
    expect(screen.getByTestId("live-map")).toHaveAttribute("data-bus-lat", "17.341800");

    fireEvent.click(screen.getByRole("button", { name: /Add 5-min delay/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/\+5 min/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Simulate offline/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Restore connection/i })).toBeInTheDocument();
      expect(screen.getAllByText(/offline|last known/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Restore connection/i }));
    fireEvent.click(screen.getByRole("button", { name: /^End trip$/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Start trip$/i })).toBeInTheDocument();
    });

    fireEvent.change(routeSelect, { target: { value: "route-b" } });
    await waitFor(() => {
      expect(routeSelect).toHaveValue("route-b");
      expect(screen.getByTestId("live-map")).toHaveAttribute("data-route-id", "route-b");
      expect(screen.getByTestId("live-map")).toHaveAttribute("data-bus-lat", "17.341800");
    });
  });
});

describe("driver demo flow", () => {
  it("starts and ends a demo trip without requesting browser GPS", async () => {
    renderWithProvider(
      <>
        <RoleButton role="driver" />
        <DriverDashboard />
      </>,
    );

    const startButton = () =>
      screen.getAllByRole("button", { name: /^Start Trip$/i })[0];
    const endButton = () => screen.getAllByRole("button", { name: /^End Trip$/i })[0];
    const resetButton = () => screen.getAllByRole("button", { name: /^Reset$/i })[0];

    fireEvent.click(screen.getByRole("button", { name: /Set driver role/i }));
    await waitFor(() => expect(startButton()).toBeInTheDocument());
    expect(startButton()).toBeDisabled();
    expect(endButton()).toBeEnabled();
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

    fireEvent.click(endButton());
    await waitFor(() => {
      expect(startButton()).toBeEnabled();
      expect(endButton()).toBeDisabled();
    });
  });
});

describe("login and admin flows", () => {
  it("switches local demo roles from the login page", async () => {
    renderWithProvider(<LoginPage />);
    const driverRole = await screen.findByRole("button", { name: /Driver/i });
    fireEvent.click(driverRole);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/driver");
      expect(screen.getByText(/Switched to the local demo driver role/i)).toBeInTheDocument();
    });
  });

  it("adds a validated bus through the admin dialog", async () => {
    renderWithProvider(
      <>
        <RoleButton role="admin" />
        <AdminDashboard />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Set admin role/i }));
    const addButtons = await screen.findAllByRole("button", { name: /^Add bus$/i });
    fireEvent.click(addButtons[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Bus number"), {
      target: { value: "BT-UI-01" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Add bus$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("tab", { name: /Buses/i }));
    await waitFor(() => {
      expect(screen.getAllByText("BT-UI-01").length).toBeGreaterThan(0);
    });
  });
});
