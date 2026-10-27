import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import { AppProvider } from "@/state/app-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("responsive navigation", () => {
  it("renders a mobile bottom navigation, desktop sidebar and visible demo badge", async () => {
    render(
      <AppProvider>
        <AppShell>
          <div>Dashboard content</div>
        </AppShell>
      </AppProvider>,
    );

    const mobileNav = screen.getByLabelText("Mobile primary navigation");
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav.className).toContain("md:hidden");
    expect(screen.getAllByRole("link", { name: /live/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /routes/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /open more navigation/i })).toBeInTheDocument();

    const desktopSidebar = document.querySelector("aside");
    expect(desktopSidebar).not.toBeNull();
    expect(desktopSidebar?.className).toContain("hidden");
    expect(desktopSidebar?.className).toContain("md:flex");
    await waitFor(() => {
      expect(screen.getAllByText(/DEMO MODE/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Lords Institute|LIET/).length).toBeGreaterThan(0);
    });
  });
});
