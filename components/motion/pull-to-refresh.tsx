"use client";

import { animate, m, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Check, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { dampPull } from "@/lib/gestures";
import { SPRING } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THRESHOLD = 72;
const HOLD = 56;
const MAX = 128;

type PullStatus = "idle" | "pulling" | "ready" | "refreshing" | "done";

export interface PullToRefreshProps {
  /** Runs when the user pulls past the threshold. Resolve when fresh data is in place. */
  onRefresh: () => Promise<unknown> | unknown;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /** Announced to assistive technology while refreshing / when done. */
  labels?: { refreshing: string; done: string };
}

/**
 * Touch pull-to-refresh for pages that list route information.
 *
 * It only engages when the window is scrolled to the top and the finger moves
 * downward, so normal scrolling is untouched. While engaged it cancels the
 * native overscroll (and Safari's own reload gesture) and rubber-bands the
 * content behind a small indicator. Keyboard and desktop users get the same
 * action through `RefreshButton`.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
  labels = { refreshing: "Refreshing…", done: "Updated" },
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pull = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<PullStatus>("idle");
  const statusRef = useRef<PullStatus>("idle");
  const startY = useRef<number | null>(null);
  const engaged = useRef(false);

  const update = useCallback((next: PullStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const indicatorOpacity = useTransform(pull, [0, 28, HOLD], [0, 0.6, 1]);
  const indicatorRotate = useTransform(pull, [0, THRESHOLD], [0, 180]);
  const indicatorScale = useTransform(pull, [0, THRESHOLD], [0.6, 1]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || disabled) return;

    const settle = (target: number) =>
      reduceMotion ? pull.set(target) : animate(pull, target, SPRING.snappy);

    const onTouchStart = (event: TouchEvent) => {
      if (statusRef.current === "refreshing" || statusRef.current === "done") return;
      if (window.scrollY > 0 || event.touches.length !== 1) {
        startY.current = null;
        return;
      }
      startY.current = event.touches[0].clientY;
      engaged.current = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startY.current === null) return;
      const dy = event.touches[0].clientY - startY.current;
      if (!engaged.current) {
        if (dy < 0 || window.scrollY > 0) {
          startY.current = null;
          return;
        }
        if (dy < 10) return;
        engaged.current = true;
      }
      if (event.cancelable) event.preventDefault();
      const distance = dampPull(dy - 10, MAX);
      pull.set(distance);
      update(distance >= THRESHOLD ? "ready" : "pulling");
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (!engaged.current) return;
      engaged.current = false;

      if (pull.get() < THRESHOLD) {
        settle(0);
        update("idle");
        return;
      }

      update("refreshing");
      settle(HOLD);
      void (async () => {
        try {
          await onRefresh();
        } finally {
          update("done");
          window.setTimeout(() => {
            settle(0);
            update("idle");
          }, 560);
        }
      })();
    };

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, onRefresh, pull, reduceMotion, update]);

  return (
    <div ref={containerRef} className={cn("relative", className)} data-pull-status={status}>
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 z-10 -ml-5 -mt-12 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-700 shadow-float"
        style={{ y: pull, opacity: indicatorOpacity, scale: indicatorScale }}
      >
        {status === "done" ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <m.span style={{ rotate: status === "refreshing" ? 0 : indicatorRotate }} className="flex">
            <RefreshCw className={cn("h-4 w-4", status === "refreshing" && "animate-spin")} />
          </m.span>
        )}
      </m.div>
      <span className="sr-only" aria-live="polite">
        {status === "refreshing" ? labels.refreshing : status === "done" ? labels.done : ""}
      </span>
      <m.div style={{ y: pull }}>{children}</m.div>
    </div>
  );
}

/**
 * The non-touch counterpart to pull-to-refresh: a quiet button that runs the
 * same action and reports when it finished.
 */
export function RefreshButton({
  onRefresh,
  className,
  label = "Refresh",
}: {
  onRefresh: () => Promise<unknown> | unknown;
  className?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  useEffect(() => {
    if (state !== "done") return;
    const timer = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("text-slate-600", className)}
      disabled={state === "loading"}
      aria-live="polite"
      onClick={async () => {
        setState("loading");
        try {
          await onRefresh();
        } finally {
          setState("done");
        }
      }}
    >
      {state === "done" ? (
        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
      ) : (
        <RefreshCw className={cn("h-4 w-4", state === "loading" && "animate-spin")} aria-hidden="true" />
      )}
      {state === "done" ? "Updated" : state === "loading" ? "Refreshing…" : label}
    </Button>
  );
}
