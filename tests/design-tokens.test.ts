// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("BusTrack design tokens", () => {
  it("defines a single RGB source for brand colors with working opacity utilities", async () => {
    const tokens = await readFile(new URL("../app/tokens.css", import.meta.url), "utf8");
    const config = await readFile(new URL("../tailwind.config.ts", import.meta.url), "utf8");
    const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

    expect(tokens).toContain("--color-brand-600: 28 95 240;");
    expect(tokens).toContain("--color-navy-950: 10 24 44;");
    expect(config).toContain('"rgb(var(--color-brand-50) / <alpha-value>)"');
    expect(config).toContain('"rgb(var(--color-navy-950) / <alpha-value>)"');
    expect(config).toContain('card: "var(--shadow-card)"');
    expect(layout).toContain('import "./tokens.css"');
  });
});
