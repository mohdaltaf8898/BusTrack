/**
 * Pure gesture math shared by the swipeable cards, bottom sheets and the
 * pull-to-refresh control. Keeping the decisions here (rather than inside
 * pointer handlers) makes them unit-testable and consistent across surfaces.
 */

export type SwipeDirection = "left" | "right";

export interface SwipeInput {
  /** Horizontal distance travelled since the drag started, in px. */
  offset: number;
  /** Horizontal velocity at release, in px/s. */
  velocity: number;
  /** Distance that commits a swipe without a flick. Defaults to 72px. */
  threshold?: number;
  /** Velocity that commits a swipe even on a short drag. Defaults to 520px/s. */
  velocityThreshold?: number;
}

/** Decide whether a horizontal drag release counts as a swipe, and which way. */
export function resolveSwipe({
  offset,
  velocity,
  threshold = 72,
  velocityThreshold = 520,
}: SwipeInput): SwipeDirection | null {
  const flick = Math.abs(velocity) >= velocityThreshold && Math.abs(offset) >= threshold * 0.35;
  const committed = Math.abs(offset) >= threshold;
  if (!flick && !committed) return null;
  if (flick) return velocity < 0 ? "left" : "right";
  return offset < 0 ? "left" : "right";
}

export interface DismissInput {
  /** Vertical distance dragged downwards, in px (positive = down). */
  offset: number;
  /** Vertical velocity at release, in px/s. */
  velocity: number;
  /** Height of the panel, used to scale the distance threshold. */
  height: number;
  /** Fraction of the height that commits a dismissal. Defaults to 0.3. */
  fraction?: number;
  /** Downward velocity that commits a dismissal. Defaults to 640px/s. */
  velocityThreshold?: number;
}

/** Decide whether a downward drag release should close a sheet. */
export function shouldDismiss({
  offset,
  velocity,
  height,
  fraction = 0.3,
  velocityThreshold = 640,
}: DismissInput) {
  if (offset <= 0) return false;
  if (velocity >= velocityThreshold && offset > 24) return true;
  return offset >= Math.max(48, height * fraction);
}

/**
 * Pick the snap point a sheet should settle on. Velocity biases the choice
 * toward the point in the direction of travel so a flick feels responsive.
 */
export function nearestSnapPoint(value: number, points: number[], velocity = 0) {
  if (points.length === 0) return value;
  const sorted = [...points].sort((a, b) => a - b);
  const projected = value + velocity * 0.12;
  let best = sorted[0];
  let bestDistance = Math.abs(projected - best);
  for (const point of sorted) {
    const distance = Math.abs(projected - point);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Rubber-band a pull distance so the indicator slows down the further it is
 * dragged. Returns a value in [0, max).
 */
export function dampPull(distance: number, max = 120) {
  if (distance <= 0) return 0;
  return max * (1 - Math.exp(-distance / max));
}

/** Progress (0–1) of a pull toward its trigger threshold. */
export function pullProgress(distance: number, threshold = 72) {
  if (threshold <= 0) return 1;
  return Math.max(0, Math.min(1, distance / threshold));
}
