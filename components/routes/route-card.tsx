"use client";

import { Check, ChevronDown, Clock3, MapPinOff, Navigation } from "lucide-react";
import { AnimatePresence, m, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useRef } from "react";
import { resolveSwipe } from "@/lib/gestures";
import { formatScheduledTime } from "@/lib/format";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";
import type { Route } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 72;

export interface RouteCardProps {
  route: Route;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onTrack: () => void;
}

/**
 * One route in the catalog.
 *
 * - Tap the header to expand a summary (pickup window, mapped-stop count).
 * - The "Select route" button is always present for keyboard and screen-reader
 *   users; the gestures below are shortcuts, not the only path.
 * - Swipe right to select the route; swipe left to open it on the map. The
 *   action behind the card grows as the drag approaches the commit point, and
 *   the card springs back to the origin on release.
 */
export function RouteCard({ route, selected, expanded, onToggle, onSelect, onTrack }: RouteCardProps) {
  const x = useMotionValue(0);
  const dragging = useRef(false);
  const selectScale = useTransform(x, [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0.6, 0.85, 1.15]);
  const selectOpacity = useTransform(x, [0, 24], [0, 1]);
  const trackScale = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0], [1.15, 0.85, 0.6]);
  const trackOpacity = useTransform(x, [-24, 0], [1, 0]);
  // Coloured layer exists only while the card is displaced (no edge bleed at rest).
  const layerOpacity = useTransform(x, [-6, 0, 6], [1, 0, 1]);

  const mappedStops = route.stops.filter((stop) => stop.lat != null && stop.lng != null).length;
  const unmappedStops = route.stops.length - mappedStops;
  const firstStop = route.stops[0];
  const lastStop = route.stops[route.stops.length - 1];
  const routeNumber = route.code.replace(/\D/g, "").padStart(2, "0");
  const panelId = `route-card-panel-${route.id}`;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const direction = resolveSwipe({ offset: info.offset.x, velocity: info.velocity.x, threshold: SWIPE_THRESHOLD });
    if (direction === "right") onSelect();
    if (direction === "left") onTrack();
    // Clicks can follow a mouse drag on the same element; ignore them briefly.
    window.setTimeout(() => {
      dragging.current = false;
    }, 60);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white transition-colors duration-200",
        selected ? "border-brand-300 shadow-glow" : "border-slate-200 shadow-card",
      )}
      data-testid={`route-card-${route.id}`}
    >
      {/* Action layer revealed by the swipe. */}
      <m.div
        className="pointer-events-none absolute inset-0 flex items-stretch justify-between"
        style={{ opacity: layerOpacity }}
        aria-hidden="true"
      >
        <div className="flex w-32 items-center gap-2 bg-brand-600 pl-5 text-white">
          <m.span style={{ scale: selectScale, opacity: selectOpacity }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Check className="h-4 w-4" />
          </m.span>
          <m.span style={{ opacity: selectOpacity }} className="text-xs font-semibold">
            Select
          </m.span>
        </div>
        <div className="flex w-32 items-center justify-end gap-2 bg-navy-950 pr-5 text-white">
          <m.span style={{ opacity: trackOpacity }} className="text-xs font-semibold">
            Track
          </m.span>
          <m.span style={{ scale: trackScale, opacity: trackOpacity }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Navigation className="h-4 w-4" />
          </m.span>
        </div>
      </m.div>

      {/* Opaque surface: the action layer must stay hidden until the card is dragged aside. */}
      <m.div
        className={cn("relative z-10", selected ? "bg-brand-50" : "bg-white")}
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragSnapToOrigin
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.32}
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
        <div className="flex min-h-[92px] items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:gap-4"
          >
            <m.span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums",
                selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-navy-700",
              )}
              animate={{ scale: selected ? 1.04 : 1 }}
              transition={SPRING.gentle}
              aria-hidden="true"
            >
              {routeNumber}
            </m.span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 break-words text-sm font-semibold leading-5 text-navy-950">{route.name}</span>
              <span className="mt-1 block truncate text-xs text-slate-600">
                {route.stops.length} stops · {route.scheduleYear ?? "Custom"} · {route.busNumber.startsWith("SIM-") ? "Simulation vehicle" : route.busNumber}
              </span>
            </span>
            <m.span
              className="ml-1 hidden shrink-0 text-slate-500 sm:block"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              aria-hidden="true"
            >
              <ChevronDown className="h-4 w-4" />
            </m.span>
          </button>
          <Button
            variant={selected ? "soft" : "ghost"}
            size="sm"
            aria-pressed={selected}
            className="shrink-0"
            onClick={onSelect}
          >
            {selected ? "Selected route" : "Select route"}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <m.div
              key="panel"
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1, transition: { height: { duration: DURATION.base, ease: EASE_OUT }, opacity: { duration: 0.2, delay: 0.05 } } }}
              exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.22 }, opacity: { duration: 0.12 } } }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5">
                <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="flex items-center gap-1.5 text-slate-500"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> First pickup</dt>
                    <dd className="mt-1 font-semibold text-navy-950">{firstStop ? formatScheduledTime(firstStop.scheduledTime) : "—"}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="flex items-center gap-1.5 text-slate-500"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Last listed time</dt>
                    <dd className="mt-1 font-semibold text-navy-950">{lastStop ? formatScheduledTime(lastStop.scheduledTime) : "—"}</dd>
                  </div>
                  <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1">
                    <dt className="flex items-center gap-1.5 text-slate-500"><MapPinOff className="h-3.5 w-3.5" aria-hidden="true" /> Map coverage</dt>
                    <dd className="mt-1 font-semibold text-navy-950">
                      {mappedStops} of {route.stops.length} stops located
                      {unmappedStops > 0 ? ` · ${unmappedStops} pending` : ""}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {route.startLocation} → {route.destination}. Times are the {route.scheduleYear ?? "listed"} timetable, not a live schedule.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="primary" onClick={onTrack}>
                    <Navigation className="h-4 w-4" aria-hidden="true" /> Track on map
                  </Button>
                  <span className="text-xs text-slate-500 sm:hidden">Swipe right to select, left to track</span>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </div>
  );
}
