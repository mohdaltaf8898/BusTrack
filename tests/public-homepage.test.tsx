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

  it("keeps spaces between the staggered headline words", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1, name: /know which bus is coming/i });
    // Each word is clipped in its own inline-block for the rise animation; the
    // visible text must still read as a sentence, not one run-together word.
    expect(heading.textContent?.replace(/\s+/g, " ").trim()).toBe("Know which bus is coming, and roughly when");
    // A space that ends up *inside* a clipped inline-block is collapsed by the
    // browser, so every separator has to live between the clipping spans.
    const clipped = Array.from(heading.querySelectorAll("span.overflow-hidden"));
    expect(clipped.length).toBeGreaterThan(5);
    for (const span of clipped) expect(span.textContent).toMatch(/\S$/);
  });

  it("states plainly that positions are not live and times are estimates", () => {
    render(<HomePage />);
    expect(
      screen.getByText(/A live bus position appears only while an authorized driver is sharing GPS/i),
    ).toBeInTheDocument();
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

  it("opens without a stat strip, eyebrow labels or accent-coloured headline words", () => {
    const { container } = render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1, name: /know which bus is coming/i });
    // The headline is one colour: no single word is picked out in brand blue.
    expect(heading.querySelector(".text-brand-600, .text-brand-700")).toBeNull();
    // The hero makes its case in prose; the catalog numbers live in the
    // "what is estimated" section where they can be explained.
    expect(container.querySelector("header dl, section:first-of-type dl")).toBeNull();
    // No small-caps kicker sits above any section heading.
    expect(container.querySelector("[class*='uppercase']")).toBeNull();
  });

  it("keeps transport contact details marked as placeholders", () => {
    render(<HomePage />);
    expect(screen.getByText("(placeholder)")).toBeInTheDocument();
    expect(
      screen.getByText(/Contact details are placeholders until the transport office confirms them/i),
    ).toBeInTheDocument();
  });
});
