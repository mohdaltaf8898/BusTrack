import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { HOME_STATS } from "@/components/home/sections";

// The header only reads the session to swap its call to action.
vi.mock("@/state/app-provider", () => ({ useApp: () => ({ state: { user: null } }) }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("public introduction page", () => {
  it("introduces the product without exposing the signed-in workspace", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /know which bus is coming/i }),
    ).toBeInTheDocument();

    // Only introduction-level navigation is public.
    expect(screen.queryByLabelText("Student navigation")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mobile primary navigation")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Selected bus route")).not.toBeInTheDocument();

    // Both direct sign-up routes are offered from the first screen.
    const signUpLinks = screen.getAllByRole("link", { name: /create a student account|create account/i });
    expect(signUpLinks.length).toBeGreaterThan(1);
    expect(signUpLinks[0]).toHaveAttribute("href", "/signup");
    expect(screen.getAllByRole("link", { name: /^Sign in$/i })[0]).toHaveAttribute("href", "/login");
  });

  it("states plainly that positions are not live and times are estimates", () => {
    render(<HomePage />);
    expect(screen.getByText(/Nothing here pretends to be\s*live vehicle tracking/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Simulated/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Inferred geometry/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimated times/i)).toBeInTheDocument();
    expect(screen.queryByText(/DEMO MODE/i)).not.toBeInTheDocument();
  });

  it("reports the published catalog honestly, including stops without coordinates", () => {
    render(<HomePage />);
    expect(HOME_STATS.routes).toBe(16);
    expect(HOME_STATS.stops).toBe(154);
    expect(HOME_STATS.unlocated).toBeGreaterThan(0);
    expect(screen.getByText(/stops have no reliable coordinates yet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Contains data provided by TGSRTC/i).length).toBeGreaterThan(0);
  });

  it("keeps transport contact details marked as placeholders", () => {
    render(<HomePage />);
    expect(screen.getByText("(placeholder)")).toBeInTheDocument();
    expect(
      screen.getByText(/Contact details are placeholders until the transport office confirms them/i),
    ).toBeInTheDocument();
  });
});
