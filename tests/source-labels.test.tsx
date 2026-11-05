import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoModeBadge, SourceLabel, StatusPill } from "@/components/ui/labels";

describe("location provenance labels", () => {
  it("distinguishes simulation, current device GPS, and stale GPS in text", () => {
    render(<>
      <DemoModeBadge />
      <SourceLabel mode="simulation" />
      <SourceLabel mode="live" />
      <SourceLabel mode="last-known" />
      <StatusPill status="offline" />
    </>);
    expect(screen.getByText("DEMO MODE")).toBeInTheDocument();
    expect(screen.getByText("Simulated data")).toBeInTheDocument();
    expect(screen.getByText("Device GPS")).toBeInTheDocument();
    expect(screen.getByText("Last known GPS")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });
});
