import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("component class overrides", () => {
  it("lets dark cards override the default white background and border", () => {
    const classes = cn("rounded-2xl border bg-white shadow-card", "border-0 bg-navy-950 text-white shadow-float");
    expect(classes).toContain("bg-navy-950");
    expect(classes).toContain("border-0");
    expect(classes).not.toContain("bg-white");
    expect(classes).not.toContain("shadow-card");
  });
});
