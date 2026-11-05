"use client";

import { m } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT } from "@/lib/motion";

/**
 * Entrance-only page transition for workspace routes. The wrapper is keyed by
 * pathname, so each navigation remounts it and the incoming page rises in.
 *
 * Deliberately no exit animation: in the App Router the layout's `children`
 * slot re-renders with the *new* page as soon as the URL changes, so an
 * `AnimatePresence mode="wait"` exit would fade the new page out and in again
 * (a visible double render plus a blank gap). An entrance alone keeps
 * navigation instant, never delays auth redirects, and settles the transform
 * to `none` so `position: fixed` overlays inside pages behave normally.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <m.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
      className="min-w-0"
    >
      {children}
    </m.div>
  );
}
