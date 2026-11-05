import type { Transition, Variants } from "motion/react";

/**
 * BusTrack motion tokens. Every animated surface in the app draws from this
 * file so timing, easing and distances stay consistent: short, eased, and
 * never in the way of reading an arrival estimate.
 *
 * Reduced motion: `MotionProvider` sets `reducedMotion="user"`, which makes
 * Motion skip transform/layout animation (keeping opacity) when the device asks
 * for it. Components that run continuous animation (bus illustration, loaders)
 * additionally check `useReducedMotion()` and render a static frame.
 */

/** Ease-out curve used for entrances; close to an expo ease without overshoot. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Symmetric curve for things that move and come back (sheets, drawers). */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  /** Hover/press feedback, badge pops. */
  fast: 0.16,
  /** Default entrance / exit. */
  base: 0.28,
  /** Section reveals and hero copy. */
  slow: 0.5,
  /** Count-ups and timeline draws. */
  long: 0.9,
} as const;

export const SPRING: Record<"tap" | "gentle" | "sheet" | "snappy", Transition> = {
  /** Press feedback on buttons and cards. */
  tap: { type: "spring", stiffness: 520, damping: 34, mass: 0.6 },
  /** Layout changes: selected-row highlights, tab underline, nav indicator. */
  gentle: { type: "spring", stiffness: 380, damping: 36, mass: 0.8 },
  /** Bottom sheets, drawers and dialogs on mobile. */
  sheet: { type: "spring", stiffness: 420, damping: 40, mass: 0.9 },
  /** Elements snapping back after a swipe. */
  snappy: { type: "spring", stiffness: 600, damping: 42, mass: 0.7 },
};

/** Standard entrance: fade + short rise. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT },
  },
};

/** Entrance for items that should only fade (large images, maps). */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.slow, ease: EASE_OUT } },
};

/** Entrance for small items in a grid or list. */
export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
};

/** Scale-in for dialogs and popovers on larger screens. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 6,
    transition: { duration: DURATION.fast, ease: EASE_IN_OUT },
  },
};

/** Parent variants that stagger `hidden` → `visible` across children. */
export function staggerChildren(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/** Viewport options for scroll-triggered reveals: fire once, slightly before the element is fully in view. */
export const REVEAL_VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -8% 0px" } as const;

/** Press feedback shared by buttons, action rows and cards. */
export const TAP = { scale: 0.97 } as const;
export const TAP_SOFT = { scale: 0.985 } as const;
/**
 * Hover lift for cards. Motion owns `transform` on animated elements, so this
 * must be a `whileHover` value rather than a CSS hover class. Motion only
 * treats mouse pointers as hover, so touch devices never get a stuck state.
 */
export const HOVER_LIFT = { y: -3 } as const;
