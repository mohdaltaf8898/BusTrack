"use client";

import Link from "next/link";
import { m } from "motion/react";
import { useApp } from "@/state/app-provider";
import { formatClock, formatEta } from "@/lib/format";
import { DURATION, EASE_OUT, SPRING, TAP_SOFT } from "@/lib/motion";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

const statusLabel: Record<string, string> = {
  unmapped: "Location not mapped",
  completed: "Trip ended",
  arriving: "Arriving",
  approaching: "Approaching",
};

export function UpcomingStops({ limit = 5 }: { limit?: number }) {
  const { snapshot, selectStop } = useApp();
  const stops = snapshot.stopEtas.filter((item) => item.status !== "departed").slice(0, limit);

  return (
    <Card className="h-full p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-navy-950">Upcoming stops</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">Simulated arrival estimates. Select a stop to see its ETA.</p>
        </div>
        <Link href="/routes" className="inline-flex min-h-8 shrink-0 items-center text-xs font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand-600">
          All stops
        </Link>
      </div>
      {stops.length === 0 ? (
        <div className="mt-6"><EmptyState title="No stops configured" description="Add stops in the admin dashboard to see arrival estimates." /></div>
      ) : (
        <m.ol
          key={snapshot.route.id}
          className="relative mt-5 border-t border-slate-100"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
        >
          {stops.map((item) => (
            <m.li key={item.stop.id} variants={rowVariants} className="border-b border-slate-100 last:border-b-0">
              <m.button
                type="button"
                onClick={() => selectStop(item.stop.id)}
                aria-pressed={item.isSelected}
                whileTap={TAP_SOFT}
                transition={SPRING.tap}
                className={cn(
                  "relative flex min-h-[72px] w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  !item.isSelected && "hover:bg-slate-50",
                )}
              >
                {item.isSelected && (
                  <m.span
                    layoutId="upcoming-stop-selected"
                    className="absolute inset-0 rounded-lg bg-brand-50/80"
                    transition={SPRING.gentle}
                    aria-hidden="true"
                  />
                )}
                <m.span
                  className={cn(
                    "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    item.isSelected ? "border-brand-600 bg-brand-600 text-white shadow-glow" : "border-slate-200 bg-white text-slate-600",
                  )}
                  animate={{ scale: item.isSelected ? 1.08 : 1 }}
                  transition={SPRING.gentle}
                  aria-hidden="true"
                >
                  {item.stop.order}
                </m.span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-950">{item.stop.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-600">
                    {statusLabel[item.status] ?? "Upcoming"}
                    {item.etaAt ? ` · ${formatClock(item.etaAt)} IST` : ""}
                  </span>
                </span>
                <span className="relative shrink-0 text-right text-sm font-semibold tabular-nums text-navy-950">
                  {formatEta(item.etaSeconds)}
                </span>
              </m.button>
            </m.li>
          ))}
          {/* Timeline connector, drawn top to bottom as the list arrives (painted after rows so highlights sit beneath it). */}
          <m.span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-7 left-[21px] top-7 w-px origin-top bg-brand-200"
            variants={{ hidden: { scaleY: 0 }, visible: { scaleY: 1, transition: { duration: DURATION.long, ease: EASE_OUT } } }}
          />
        </m.ol>
      )}
      <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
        {snapshot.route.code} · {snapshot.bus?.number ?? "No bus assigned"} · Pickup points require confirmation.
      </p>
    </Card>
  );
}
