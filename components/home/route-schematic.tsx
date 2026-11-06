"use client";

import { m } from "motion/react";
import { sampleRoutes } from "@/data/routes";
import { DURATION, EASE_OUT, REVEAL_VIEWPORT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const stopVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

const markerVariants = {
  hidden: { scale: 0.4, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring" as const, stiffness: 420, damping: 24 } },
};

/**
 * The homepage signature: one blue line connecting numbered stops, drawn from
 * the published Route 01 pickup list. It is a static illustration — no map
 * tiles, no position, no claim of live tracking. When `animated`, the line
 * draws itself and the stops arrive in order as the figure scrolls into view.
 */
export function RouteSchematic({ className, animated = false }: { className?: string; animated?: boolean }) {
  const route = sampleRoutes[0];
  const stops = route.stops.slice(0, 6);
  const college = route.stops[route.stops.length - 1];
  const timed = stops.filter((stop) => stop.scheduledTime).length;
  const rows = [...stops, college];

  return (
    <figure
      className={cn(
        "glass-strong glass-edge overflow-hidden rounded-3xl",
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <span className="text-sm font-semibold text-navy-950">
          {route.code} · {route.startLocation}
          <span className="text-slate-400" aria-hidden="true"> → </span>
          {route.destination}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-100">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
          Estimated times
        </span>
      </figcaption>

      <m.div
        className="px-5 py-5"
        initial={animated ? "hidden" : false}
        whileInView="visible"
        viewport={REVEAL_VIEWPORT}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}
      >
        <ol className="relative space-y-4 pl-6">
          {/* The route line, drawn top to bottom. */}
          <m.span
            aria-hidden="true"
            className="absolute bottom-2 left-[4px] top-2 w-0.5 origin-top rounded-full bg-brand-200"
            variants={{
              hidden: { scaleY: 0 },
              visible: { scaleY: 1, transition: { duration: DURATION.long, ease: EASE_OUT } },
            }}
          />
          {rows.map((stop, index) => {
            const isCollege = index === rows.length - 1;
            return (
              <m.li key={stop.id} className="relative" variants={stopVariants}>
                <m.span
                  variants={markerVariants}
                  className={cn(
                    "absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ring-4 ring-white",
                    isCollege
                      ? "bg-navy-900 text-white"
                      : index === 0
                        ? "bg-brand-600 text-white shadow-glow"
                        : "border border-brand-200 bg-white text-navy-800",
                  )}
                  aria-hidden="true"
                >
                  {stop.order}
                </m.span>
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className={cn("text-sm text-navy-950", isCollege ? "font-semibold" : "font-medium")}>{stop.name}</span>
                  <span className="font-mono text-xs text-slate-600">
                    {stop.scheduledTime ?? (
                      <span className="text-slate-400">{isCollege ? "arrival time not published" : "time not published"}</span>
                    )}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {isCollege
                    ? `${route.stops.length - stops.length} more stops on this route`
                    : stop.landmark ?? (stop.lat === null ? "Stop not yet located on the map" : "Published pickup point")}
                </span>
              </m.li>
            );
          })}
        </ol>
      </m.div>

      <p className="border-t border-slate-100 bg-surface-muted px-5 py-3 text-xs leading-5 text-slate-600">
        Illustration of the published 2025–26 pickup list — {timed} of the first {stops.length} stops
        carry a time. The signed-in dashboard turns this into a stop-by-stop estimate for your own
        boarding point.
      </p>
    </figure>
  );
}
