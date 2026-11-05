"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DURATION, EASE_OUT } from "@/lib/motion";

export interface CountUpProps {
  value: number;
  /** Seconds for the first count-up. Later value changes animate in half that. */
  duration?: number;
  delay?: number;
  /** Formats the displayed number; defaults to `toLocaleString("en-IN")`. */
  format?: (value: number) => string;
  className?: string;
  /** Accessible label; defaults to the formatted final value. */
  "aria-label"?: string;
}

/**
 * Counts from zero to `value` the first time it scrolls into view, then eases
 * between later values (for live counters such as unread alerts).
 *
 * Server-rendered HTML carries the final value, so the number is correct
 * before JavaScript runs and with reduced motion enabled.
 */
export function CountUp({
  value,
  duration = DURATION.long,
  delay = 0,
  format = (n) => Math.round(n).toLocaleString("en-IN"),
  className,
  "aria-label": ariaLabel,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const shown = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    const from = shown.current;
    if (reduceMotion || (from !== null && from === value)) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const start = from ?? 0;
    const controls = animate(start, value, {
      duration: from === null ? duration : duration / 2,
      delay: from === null ? delay : 0,
      ease: EASE_OUT,
      onUpdate: (latest) => setDisplay(latest),
      onComplete: () => setDisplay(value),
    });
    shown.current = value;
    return () => controls.stop();
  }, [inView, value, duration, delay, reduceMotion]);

  // The animating digits are decorative; assistive tech reads the final value once.
  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{format(display)}</span>
      <span className="sr-only">{ariaLabel ?? format(value)}</span>
    </span>
  );
}
