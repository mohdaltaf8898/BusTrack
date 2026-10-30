"use client";

import {
  BusFront,
  Clock3,
  MapPin,
  Navigation,
  Radio,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { describeEtaMethod } from "@/lib/eta";
import {
  formatClock,
  formatDistance,
  formatEta,
  formatRelativeTime,
} from "@/lib/format";
import { bearingToCompass } from "@/lib/geo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, ProgressBar } from "@/components/ui/feedback";
import { SimulatedTag, SourceLabel, StatusPill } from "@/components/ui/labels";

export function StatusCard() {
  const { state, snapshot } = useApp();
  const {
    route,
    bus,
    busStatus,
    selectedStop,
    selectedStopEta,
    busPosition,
    progressPercent,
    lastUpdateAt,
    isStale,
    traffic,
    simulation,
    isLiveData,
  } = snapshot;
  const offline = busStatus === "offline" || isStale;
  const etaLabel = selectedStopEta.status === "unmapped"
    ? "Unavailable"
    : offline ? "Paused" : formatEta(selectedStopEta.etaSeconds);

  return (
    <Card className="relative overflow-hidden border-0 bg-navy-950 p-5 text-white shadow-float sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-brand-200">
              <BusFront className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60">Bus {bus?.number ?? route.busNumber}</p>
              <h2 className="text-base font-extrabold sm:text-lg">{route.name}</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={busStatus} />
            <SourceLabel mode={snapshot.dataMode} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-[1.15fr_0.85fr] sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">
              Estimated arrival · {selectedStop.name}
            </p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <span className={selectedStopEta.status === "unmapped" ? "text-3xl font-extrabold leading-none tracking-tight sm:text-4xl" : "text-[44px] font-extrabold leading-none tracking-tight sm:text-6xl"}>
                {etaLabel}
              </span>
              {!offline && selectedStopEta.etaSeconds != null && selectedStopEta.etaSeconds > 30 && (
                <span className="mb-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-white/80">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  around {formatClock(selectedStopEta.etaAt)} IST
                </span>
              )}
            </div>
            <p className="mt-2 max-w-xl text-xs leading-5 text-white/60">
              {selectedStopEta.status === "unmapped"
                ? "This stop has no verified map location yet. Its published pickup time is available on the routes page."
                : describeEtaMethod(route, traffic)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/[0.07] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Distance to stop
              </p>
              <p className="mt-1 text-lg font-extrabold">
                {formatDistance(selectedStopEta.distanceMeters)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.07] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                Last update
              </p>
              <p className="mt-1 text-sm font-extrabold">
                {formatRelativeTime(lastUpdateAt, state.currentTime)}
              </p>
              <p className="text-[11px] text-white/45">{formatClock(lastUpdateAt)} IST</p>
            </div>
            <div className="rounded-2xl bg-white/[0.07] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                Direction
              </p>
              <p className="mt-1 text-sm font-extrabold">
                {bearingToCompass(busPosition.bearing)} · {Math.round(busPosition.bearing)}°
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.07] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                Sim traffic
              </p>
              <p className="mt-1 text-sm font-extrabold">{traffic.label}</p>
              {simulation.delaySeconds > 0 && (
                <p className="text-[11px] text-amber-200">
                  +{Math.round(simulation.delaySeconds / 60)} min delay
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-white/60">
            <span className="max-w-[45%] truncate">{route.startLocation}</span>
            <span>{Math.round(progressPercent)}% along demo route</span>
            <span className="max-w-[45%] truncate text-right">{route.destination}</span>
          </div>
          <ProgressBar value={progressPercent} className="bg-white/15" indicatorClassName="bg-brand-400" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SimulatedTag label={isLiveData ? "Simulated traffic ETA" : "Simulated location"} />
          <Badge tone="navy" className="bg-white/10 text-white/80 ring-white/10">
            {isStale ? "Last known position" : snapshot.sourceLabel}
          </Badge>
          <span className="text-[11px] text-white/45">2025–26 pickup times; confirm current service.</span>
        </div>

        {(offline || isStale) && (
          <Alert tone="warning" className="mt-4 border-white/10 bg-amber-400/10 text-amber-50">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {isStale
                  ? "Location updates have stopped. The map keeps the last known position and the ETA is frozen as an estimate."
                  : "This bus is currently offline in the simulation. Start a trip or restore sharing from the driver dashboard."}
              </span>
            </div>
          </Alert>
        )}
      </div>
    </Card>
  );
}
