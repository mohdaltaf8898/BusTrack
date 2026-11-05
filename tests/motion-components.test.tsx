import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MotionProvider } from "@/components/motion/motion-provider";
import { CountUp } from "@/components/motion/count-up";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Faq } from "@/components/home/faq";
import { RouteCard } from "@/components/routes/route-card";
import { BottomSheet } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { sampleRoutes } from "@/data/routes";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("reveal primitives", () => {
  it("renders children and keeps headings in the accessibility tree", () => {
    render(
      <MotionProvider>
        <Reveal as="section" aria-label="Intro">
          <h2>Heading</h2>
        </Reveal>
        <RevealGroup as="ul">
          <RevealItem as="li">One</RevealItem>
          <RevealItem as="li" variant="small">Two</RevealItem>
        </RevealGroup>
      </MotionProvider>,
    );
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("count-up", () => {
  it("exposes the final value to assistive technology at all times", () => {
    render(<CountUp value={154} aria-label="154 stops" />);
    expect(screen.getByText("154 stops")).toHaveClass("sr-only");
  });
});

describe("FAQ accordion", () => {
  const items = [
    { q: "Is the position live?", a: "No — unless a driver device is sharing." },
    { q: "Where do times come from?", a: "The published 2025–26 timetable." },
  ];

  it("opens one answer at a time with proper ARIA wiring", () => {
    render(<MotionProvider><Faq items={items} /></MotionProvider>);
    const first = screen.getByRole("button", { name: /is the position live/i });
    const second = screen.getByRole("button", { name: /where do times come from/i });
    expect(first).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(first.getAttribute("aria-controls")!);
    expect(panel).not.toBeNull();
    expect(within(panel!).getByText(/driver device is sharing/i)).toBeInTheDocument();
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
  });
});

describe("route card", () => {
  const route = sampleRoutes[0];

  it("keeps select and track reachable without gestures and announces expansion", () => {
    const onSelect = vi.fn();
    const onTrack = vi.fn();
    const onToggle = vi.fn();
    const { rerender } = render(
      <MotionProvider>
        <RouteCard route={route} selected={false} expanded={false} onToggle={onToggle} onSelect={onSelect} onTrack={onTrack} />
      </MotionProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Select route$/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);

    const header = screen.getByRole("button", { name: new RegExp(route.name) });
    expect(header).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(header);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <MotionProvider>
        <RouteCard route={route} selected expanded onToggle={onToggle} onSelect={onSelect} onTrack={onTrack} />
      </MotionProvider>,
    );
    expect(screen.getByRole("button", { name: /Selected route/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/stops located/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /track on map/i }));
    expect(onTrack).toHaveBeenCalledTimes(1);
    // The summary never lists stop names, so the ordered stop list below stays the only place they appear.
    expect(screen.queryByText(route.stops[1].name)).not.toBeInTheDocument();
  });
});

describe("bottom sheet", () => {
  it("renders as a dialog, closes on Escape and restores focus", () => {
    const onClose = vi.fn();
    render(
      <MotionProvider>
        <button type="button">Opener</button>
        <BottomSheet open onClose={onClose} title="Select your stop" description="Pick one">
          <p>Sheet body</p>
        </BottomSheet>
      </MotionProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "Select your stop" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("Sheet body")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders nothing while closed", () => {
    render(<MotionProvider><BottomSheet open={false} onClose={() => {}} title="Hidden" /></MotionProvider>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("tabs and switch", () => {
  it("moves the selected tab and toggles the switch", () => {
    const onChange = vi.fn();
    const onCheckedChange = vi.fn();
    render(
      <MotionProvider>
        <Tabs items={[{ id: "a", label: "All", count: 3 }, { id: "b", label: "Unread" }]} value="a" onChange={onChange} />
        <Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Browser alerts" />
      </MotionProvider>,
    );
    expect(screen.getByRole("tab", { name: /All/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    expect(onChange).toHaveBeenCalledWith("b");
    const toggle = screen.getByRole("switch", { name: "Browser alerts" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
