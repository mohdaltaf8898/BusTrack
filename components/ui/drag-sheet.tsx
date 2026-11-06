"use client";

import { animate, m, useDragControls, useMotionValue, useReducedMotion, type PanInfo } from "motion/react";
import { ChevronUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { nearestSnapPoint } from "@/lib/gestures";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type DragSheetSnap = "peek" | "half" | "full";

const SNAP_ORDER: DragSheetSnap[] = ["peek", "half", "full"];

export interface DragSheetProps {
  /** Always-visible summary; it is also the drag handle. */
  summary: ReactNode;
  /** Content revealed as the sheet is pulled up. Scrolls when fully open. */
  children: ReactNode;
  /** Height of the resting (collapsed) state in px. */
  peekHeight?: number;
  /** Fraction of the parent the sheet covers when fully open. */
  fullFraction?: number;
  /** Accessible name for the expand/collapse control. */
  label?: string;
  className?: string;
  onSnapChange?: (snap: DragSheetSnap) => void;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Persistent, non-modal bottom sheet for map screens.
 *
 * The sheet rests on its `peekHeight` and can be dragged up to a half and a
 * full position; releasing picks the nearest snap, biased by flick velocity.
 * Only the summary/handle starts a drag when the sheet is fully open so the
 * content underneath can scroll natively; in the lower positions the whole
 * sheet drags. A hidden button mirrors the gesture for keyboard users.
 *
 * It is positioned relative to its parent and never covers the parent's top
 * `100% - fullFraction`, so map controls stay reachable.
 */
export function DragSheet({
  summary,
  children,
  peekHeight = 164,
  fullFraction = 0.9,
  label = "Route details",
  className,
  onSnapChange,
}: DragSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();
  const y = useMotionValue(0);
  const [height, setHeight] = useState(0);
  const [snap, setSnap] = useState<DragSheetSnap>("peek");
  const snapRef = useRef<DragSheetSnap>("peek");

  // Offsets are negative translations from the resting position (y = 0).
  const offsets = useCallback(
    (sheetHeight: number): Record<DragSheetSnap, number> => ({
      peek: 0,
      half: -Math.max(0, sheetHeight * 0.55 - peekHeight),
      full: -Math.max(0, sheetHeight - peekHeight),
    }),
    [peekHeight],
  );

  useIsomorphicLayoutEffect(() => {
    const element = sheetRef.current;
    if (!element) return;
    const measure = () => setHeight(element.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keep the current snap stable if the viewport (and therefore height) changes.
  useEffect(() => {
    if (!height) return;
    y.set(offsets(height)[snapRef.current]);
  }, [height, offsets, y]);

  const settle = useCallback(
    (target: DragSheetSnap) => {
      const table = offsets(height);
      snapRef.current = target;
      setSnap(target);
      onSnapChange?.(target);
      animate(y, table[target], reduceMotion ? { duration: 0 } : SPRING.sheet);
    },
    [height, offsets, onSnapChange, reduceMotion, y],
  );

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const table = offsets(height);
    const nearest = nearestSnapPoint(y.get(), Object.values(table), info.velocity.y);
    const target = (Object.keys(table) as DragSheetSnap[]).find((key) => table[key] === nearest) ?? "peek";
    settle(target);
  };

  const startDrag = (event: ReactPointerEvent) => {
    controls.start(event);
  };

  const toggle = () => {
    const index = SNAP_ORDER.indexOf(snapRef.current);
    settle(snapRef.current === "full" ? "peek" : SNAP_ORDER[index + 1]);
  };

  const fullyOpen = snap === "full";

  return (
    <m.div
      ref={sheetRef}
      className={cn(
        "glass-strong glass-edge absolute inset-x-0 z-[700] flex flex-col rounded-t-3xl will-change-transform",
        className,
      )}
      style={{ y, top: `calc(100% - ${peekHeight}px)`, height: `${fullFraction * 100}%` }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: offsets(height).full, bottom: 0 }}
      dragElastic={0.06}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      data-snap={snap}
    >
      <div className="touch-none" onPointerDown={startDrag}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={snap !== "peek"}
          aria-label={snap === "full" ? `Collapse ${label.toLowerCase()}` : `Expand ${label.toLowerCase()}`}
          className="group flex w-full flex-col items-center pb-1 pt-2.5 focus-visible:outline-none"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300 transition-colors group-focus-visible:bg-brand-600" />
          <m.span
            className="mt-1 text-slate-400"
            animate={{ rotate: snap === "full" ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </m.span>
        </button>
        <div className="px-4 pb-3">{summary}</div>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 px-4 pb-6",
          fullyOpen ? "touch-pan-y overflow-y-auto overscroll-contain" : "touch-none overflow-hidden",
        )}
        onPointerDown={fullyOpen ? undefined : startDrag}
      >
        {children}
      </div>
    </m.div>
  );
}
