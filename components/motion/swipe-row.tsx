"use client";

import { animate, m, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useRef, type ReactNode } from "react";
import { resolveSwipe } from "@/lib/gestures";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  /** Background + text classes for the revealed action, e.g. `bg-rose-600 text-white`. */
  className: string;
  onCommit: () => void;
  /** Destructive actions slide the row fully out before committing. */
  destructive?: boolean;
}

export interface SwipeRowProps {
  children: ReactNode;
  className?: string;
  /** Revealed on the right edge while dragging left (typically delete). */
  swipeLeft?: SwipeAction;
  /** Revealed on the left edge while dragging right (typically mark read). */
  swipeRight?: SwipeAction;
  disabled?: boolean;
  threshold?: number;
}

/**
 * Horizontal swipe affordance for list rows. The row drags on the X axis,
 * reveals the action behind it, and commits when released past the threshold
 * (or flicked). Vertical scrolling is left to the browser via direction lock.
 * Every action is also reachable through ordinary buttons rendered by the
 * caller, so the gesture is a shortcut rather than the only path.
 */
export function SwipeRow({
  children,
  className,
  swipeLeft,
  swipeRight,
  disabled = false,
  threshold = 80,
}: SwipeRowProps) {
  const x = useMotionValue(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const leftOpacity = useTransform(x, [-threshold * 0.4, 0], [1, 0]);
  const leftScale = useTransform(x, [-threshold, -threshold * 0.5, 0], [1.1, 0.9, 0.6]);
  const rightOpacity = useTransform(x, [0, threshold * 0.4], [0, 1]);
  const rightScale = useTransform(x, [0, threshold * 0.5, threshold], [0.6, 0.9, 1.1]);
  // The coloured layer only exists while the row is displaced, so no tinted
  // edge can bleed around the rounded foreground at rest.
  const layerOpacity = useTransform(x, [-6, 0, 6], [1, 0, 1]);
  const canDrag = !disabled && Boolean(swipeLeft || swipeRight);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    window.setTimeout(() => {
      dragging.current = false;
    }, 60);
    const direction = resolveSwipe({ offset: info.offset.x, velocity: info.velocity.x, threshold });
    const action = direction === "left" ? swipeLeft : direction === "right" ? swipeRight : undefined;
    if (!action) return;
    if (action.destructive) {
      const width = rowRef.current?.offsetWidth ?? 400;
      void animate(x, direction === "left" ? -width : width, { duration: 0.18, ease: "easeIn" }).then(action.onCommit);
      return;
    }
    action.onCommit();
  };

  return (
    <div ref={rowRef} className={cn("relative overflow-hidden rounded-xl", className)}>
      {canDrag && (
        <m.div
          className="pointer-events-none absolute inset-0 flex items-stretch justify-between"
          style={{ opacity: layerOpacity }}
          aria-hidden="true"
        >
          <div className={cn("flex w-36 items-center gap-2 pl-5", swipeRight?.className ?? "opacity-0")}>
            {swipeRight && (
              <>
                <m.span style={{ scale: rightScale, opacity: rightOpacity }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  {swipeRight.icon}
                </m.span>
                <m.span style={{ opacity: rightOpacity }} className="text-xs font-semibold">
                  {swipeRight.label}
                </m.span>
              </>
            )}
          </div>
          <div className={cn("flex w-36 items-center justify-end gap-2 pr-5", swipeLeft?.className ?? "opacity-0")}>
            {swipeLeft && (
              <>
                <m.span style={{ opacity: leftOpacity }} className="text-xs font-semibold">
                  {swipeLeft.label}
                </m.span>
                <m.span style={{ scale: leftScale, opacity: leftOpacity }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  {swipeLeft.icon}
                </m.span>
              </>
            )}
          </div>
        </m.div>
      )}
      {/* Opaque surface so the coloured action layer only shows while dragging. */}
      <m.div
        className="relative z-10 rounded-xl bg-white"
        style={{ x }}
        drag={canDrag ? "x" : false}
        dragDirectionLock
        dragSnapToOrigin
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: swipeLeft ? 0.42 : 0, right: swipeRight ? 0.42 : 0 }}
        dragTransition={{ bounceStiffness: 480, bounceDamping: 38 }}
        onDragStart={() => {
          dragging.current = true;
        }}
        onDragEnd={onDragEnd}
        onClickCapture={(event) => {
          if (dragging.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {children}
      </m.div>
    </div>
  );
}
