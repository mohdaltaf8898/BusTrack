"use client";

import { AnimatePresence, m } from "motion/react";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Text that ticks: when `value` changes the old text slides up and out while
 * the new one rises in. Used for the large arrival estimate and live counters.
 */
export function AnimatedValue({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("relative inline-grid overflow-hidden align-bottom", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={value}
          initial={{ y: "45%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-45%", opacity: 0 }}
          transition={{ duration: 0.26, ease: EASE_OUT }}
          className="col-start-1 row-start-1 inline-block whitespace-nowrap"
        >
          {value}
        </m.span>
      </AnimatePresence>
    </span>
  );
}
