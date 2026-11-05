import { describe, expect, it } from "vitest";
import { dampPull, nearestSnapPoint, pullProgress, resolveSwipe, shouldDismiss } from "@/lib/gestures";

describe("swipe resolution", () => {
  it("ignores short, slow drags", () => {
    expect(resolveSwipe({ offset: -30, velocity: -100 })).toBeNull();
    expect(resolveSwipe({ offset: 40, velocity: 0 })).toBeNull();
  });

  it("commits once the distance threshold is crossed", () => {
    expect(resolveSwipe({ offset: -80, velocity: 0 })).toBe("left");
    expect(resolveSwipe({ offset: 72, velocity: 0 })).toBe("right");
  });

  it("commits a quick flick after a modest distance, in the direction of travel", () => {
    expect(resolveSwipe({ offset: -30, velocity: -900 })).toBe("left");
    expect(resolveSwipe({ offset: 30, velocity: 900 })).toBe("right");
    // A flick that has barely moved is still ignored (accidental touches).
    expect(resolveSwipe({ offset: -10, velocity: -900 })).toBeNull();
  });

  it("honours a custom threshold", () => {
    expect(resolveSwipe({ offset: -50, velocity: 0, threshold: 40 })).toBe("left");
    expect(resolveSwipe({ offset: -50, velocity: 0, threshold: 120 })).toBeNull();
  });
});

describe("sheet dismissal", () => {
  it("never dismisses on upward drags", () => {
    expect(shouldDismiss({ offset: -200, velocity: -2000, height: 400 })).toBe(false);
  });

  it("dismisses past 30% of the panel height or on a downward flick", () => {
    expect(shouldDismiss({ offset: 100, velocity: 0, height: 400 })).toBe(false);
    expect(shouldDismiss({ offset: 121, velocity: 0, height: 400 })).toBe(true);
    expect(shouldDismiss({ offset: 40, velocity: 900, height: 400 })).toBe(true);
    expect(shouldDismiss({ offset: 10, velocity: 900, height: 400 })).toBe(false);
  });

  it("keeps a minimum distance for very short panels", () => {
    expect(shouldDismiss({ offset: 40, velocity: 0, height: 100 })).toBe(false);
    expect(shouldDismiss({ offset: 48, velocity: 0, height: 100 })).toBe(true);
  });
});

describe("snap points", () => {
  it("returns the closest point at rest", () => {
    expect(nearestSnapPoint(-90, [0, -200, -400])).toBe(0);
    expect(nearestSnapPoint(-110, [0, -200, -400])).toBe(-200);
  });

  it("lets velocity carry the sheet to the next point", () => {
    expect(nearestSnapPoint(-60, [0, -200, -400], -600)).toBe(-200);
    expect(nearestSnapPoint(-340, [0, -200, -400], 1200)).toBe(-200);
  });

  it("is safe with no points", () => {
    expect(nearestSnapPoint(42, [])).toBe(42);
  });
});

describe("pull-to-refresh maths", () => {
  it("rubber-bands and saturates", () => {
    expect(dampPull(0)).toBe(0);
    expect(dampPull(-20)).toBe(0);
    expect(dampPull(60)).toBeGreaterThan(40);
    expect(dampPull(60)).toBeLessThan(60);
    expect(dampPull(5000)).toBeLessThanOrEqual(120);
    expect(dampPull(5000)).toBeGreaterThan(dampPull(200));
  });

  it("reports progress clamped to 0–1", () => {
    expect(pullProgress(-10)).toBe(0);
    expect(pullProgress(36)).toBeCloseTo(0.5);
    expect(pullProgress(500)).toBe(1);
    expect(pullProgress(10, 0)).toBe(1);
  });
});
