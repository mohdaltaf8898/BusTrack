import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RoutesPage from "@/app/routes/page";
import { AppProvider } from "@/state/app-provider";

vi.mock("next/navigation", () => ({ usePathname: () => "/routes" }));

describe("historical routes and stops", () => {
  it("browses 16 routes, exposes historical times and identifies unmapped/ambiguous stops", async () => {
    render(<AppProvider><RoutesPage /></AppProvider>);
    await screen.findByText(/route list has been reported as unchanged/i);
    expect(screen.getByText(/pickup times are from 2025–26 and have not been independently confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/2025–26 pickup: 8:47 AM/)).toBeInTheDocument();
    const unmapped = screen.getByText("Pillar No. 26").closest("button");
    expect(unmapped).not.toBeNull();
    expect(within(unmapped!).getByText(/Location pending/)).toBeInTheDocument();
    expect(within(unmapped!).getByText(/No map position/)).toBeInTheDocument();
    fireEvent.click(unmapped!);
    expect(unmapped).toHaveAttribute("aria-pressed", "true");

    // The first route is already selected, so the ninth remaining button is Route 10.
    const selectionButtons = screen.getAllByRole("button", { name: /^Select route$/i });
    expect(selectionButtons).toHaveLength(15);
    fireEvent.click(selectionButtons[8]);
    await waitFor(() => {
      expect(screen.getByText(/location is ambiguous and is not assumed to be the campus/i)).toBeInTheDocument();
      expect(screen.getByText(/2025–26 pickup: 8:32 AM/)).toBeInTheDocument();
    });
    const collegeStop = screen.getByText("College").closest("button");
    expect(collegeStop).not.toBeNull();
    expect(within(collegeStop!).getByText(/No map position/)).toBeInTheDocument();
  });
});
