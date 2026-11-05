"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./features").then((module) => module.default);

/**
 * Root motion configuration.
 *
 * - `LazyMotion` + `m.*` components keep animation code out of the critical
 *   bundle; features arrive as a separate chunk after hydration.
 * - `reducedMotion="user"` honours `prefers-reduced-motion`: transforms and
 *   layout animations are skipped while opacity changes still run, so nothing
 *   depends on motion to become visible.
 * - `strict` guarantees nobody imports the heavier `motion.*` components by
 *   accident.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
