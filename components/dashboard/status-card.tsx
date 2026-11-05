"use client";

import { ArrowUpRight, BusFront, Clock3 } from "lucide-react";
import Link from "next/link";
import { m } from "motion/react";
import { useApp } from "@/state/app-provider";
import { describeEtaMethod } from "@/lib/eta";
import { formatClock, formatDistance, formatEta, formatRelativeTime } from "@/lib/format";
import { AnimatedValue } from "@/components/motion/animated-value";
import { Card } from "@/components/ui/card";
import { Alert, Collapsible, ProgressBar } from "@/components/ui/feedback";
import { SourceLabel, StatusPill } from "@/components/ui/labels";
import { cn } from "@/lib/utils";

/**
 * Progress track with a small bus glyph that glides to the estimated position.
 * The glyph only ever reflects the same simulated/last-known progress the bar
 * already shows — the caption underneath says which.
 */
function RouteProgress({ value, paused }: { value: number; paused: boolean }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative pt-5">
      <m.span
        className={cn(
          "absolute top-0 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-lg text-white shadow-glow",
          paused ? "bg-slate-500" : "bg-brand-600",
        )}
        initial={false}
        animate={{ left: `${clamped}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 26, mass: 0.8 }}
        aria-hidden="true"
      >
        <BusFront className="h-3.5 w-3.5" />
      </m.span>
      <ProgressBar
        value={clamped}
        className="h-1 bg-slate-200"
        indicatorClassName={paused ? "bg-slate-400" : "bg-brand-600"}
      />
    </div>
  );
}

export function StatusCard() {
  const { state, snapshot } = useApp();
  const {
    route, bus, busStatus, selectedStop, selectedStopEta, progressPercent,
    lastUpdateAt, isStale, traffic, simulation, isLiveData,
  } = snapshot;
  const offline = busStatus === "offline" || isStale;
  const etaLabel = selectedStopEta.status === "unmapped"
    ? "Unavailable"
    : offline ? "Paused" : formatEta(selectedStopEta.etaSeconds);

  return (
    <Card className="overflow-hidden border-slate-200/90 bg-gradient-surface">
      <div className="px-5 pt-5 sm:px-8 sm:pt-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{route.code} · Bus {bus?.number ?? route.busNumber} · Stop {selectedStop.order}</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-navy-950 sm:text-xl">{selectedStop.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={busStatus} />
            <SourceLabel mode={snapshot.dataMode} />
          </div>
        </div>

        <div className="grid gap-7 py-8 sm:gap-10 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.35fr)] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-600">
              Estimated arrival
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
              <AnimatedValue
                value={etaLabel}
                className={selectedStopEta.status === "unmapped"
                  ? "text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-none tracking-[-0.06em] text-navy-950"
                  : "text-[clamp(3.75rem,9vw,6rem)] font-semibold leading-none tracking-[-0.07em] text-navy-950"}
              />
              {!offline && selectedStopEta.etaSeconds != null && selectedStopEta.etaSeconds > 30 && (
                <span className="mb-1 inline-flex items-center gap-1.5 text-sm text-slate-600">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  Around {formatClock(selectedStopEta.etaAt)} IST
                </span>
              )}
            </div>
            <p className="mt-4 max-w-xl text-xs leading-5 text-slate-600">
              {selectedStopEta.status === "unmapped"
                ? "This stop has no verified map location. Check its historical pickup time on the routes page."
                : describeEtaMethod(route, traffic)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pb-1 lg:pl-7 lg:pt-0">
            <div>
              <p className="text-xs text-slate-500">Distance to stop</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-navy-950">{formatDistance(selectedStopEta.distanceMeters)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last update</p>
              <p className="mt-1 text-base font-semibold text-navy-950">{formatRelativeTime(lastUpdateAt, state.currentTime)}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-white/70 px-5 py-4 sm:px-8">
        <div className="mb-2 flex items-center justify-between gap-4 text-xs text-slate-600">
          <span className="min-w-0 truncate">{route.startLocation} → {route.destination}</span>
          <span className="shrink-0 tabular-nums">{Math.round(progressPercent)}% of route estimate</span>
        </div>
        <RouteProgress value={progressPercent} paused={offline} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-slate-600">
          <span>
            {snapshot.dataMode === "last-known" ? "Last known GPS position" : isLiveData ? "Device GPS · simulated traffic ETA" : offline ? "Simulated location · paused" : "Simulated location · not live"}
            {simulation.delaySeconds > 0 ? ` · +${Math.round(simulation.delaySeconds / 60)} min simulated delay` : ""}
          </span>
          <Link href="/routes" className="group inline-flex items-center gap-1 font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand-600">
            2025–26 times · confirm service <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <Collapsible show={offline || isStale}>
        <Alert tone="warning" className="m-4 sm:m-6">
          {isStale
            ? "Location updates have stopped. The map keeps the last known position and the ETA is frozen as an estimate."
            : "This bus is offline in the simulation. Start a trip or restore sharing from the driver dashboard."}
        </Alert>
      </Collapsible>
    </Card>
  );
}
