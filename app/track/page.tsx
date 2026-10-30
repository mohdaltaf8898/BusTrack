"use client";

import {
  ArrowUpRight,
  BusFront,
  Clock3,
  Compass,
  Gauge,
  MapPin,
  Radio,
  Route as RouteIcon,
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
import { PageHeader } from "@/components/page-header";
import { RouteSelector } from "@/components/route-selector";
import { LiveMap } from "@/components/maps/live-map";
import { RouteAccuracyNote } from "@/components/maps/route-accuracy-note";
import { SimulationControls } from "@/components/dashboard/simulation-controls";
import { UpcomingStops } from "@/components/dashboard/upcoming-stops";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState, ProgressBar } from "@/components/ui/feedback";
import { Label, Select } from "@/components/ui/form";
import { SimulatedTag, SourceLabel, StatusPill } from "@/components/ui/labels";

export default function TrackPage() {
  const { state, snapshot, selectStop } = useApp();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Live tracking"
        title="Follow your bus"
        description="Watch the bus move along its route, change your ETA stop, and test delay or offline scenarios."
        actions={
          <div className="w-full min-w-0 sm:w-64">
            <RouteSelector />
          </div>
        }
      />

      {state.routes.length === 0 ? (
        <EmptyState
          title="No routes to track"
          description="Add a route in the admin dashboard before opening the live map."
        />
      ) : (
        <>
          {(snapshot.isStale || snapshot.busStatus === "offline") && (
            <Alert tone="warning" title="Stale or offline location">
              The last update was {formatRelativeTime(snapshot.lastUpdateAt, state.currentTime)}. The map shows the
              last known position; the ETA should be treated as a paused estimate.
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RouteIcon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    {snapshot.route.code} · {snapshot.route.name}
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {snapshot.route.stops.length} stops · {formatDistance(snapshot.geometry.totalDistanceMeters)} polyline
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusPill status={snapshot.busStatus} />
                  <SourceLabel mode={snapshot.dataMode} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <LiveMap
                  route={snapshot.route}
                  geometry={snapshot.geometry}
                  busPosition={snapshot.busPosition}
                  progressDistanceMeters={snapshot.effectiveDistanceMeters}
                  busStatus={snapshot.busStatus}
                  selectedStopId={snapshot.selectedStop.id}
                  isStale={snapshot.isStale}
                  isLiveData={snapshot.isLiveData}
                  onSelectStop={selectStop}
                  className="h-[430px] sm:h-[520px] lg:h-[590px]"
                />
                <RouteAccuracyNote route={snapshot.route} />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                    Heading {bearingToCompass(snapshot.busPosition.bearing)} · {Math.round(snapshot.busPosition.bearing)}°
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                    {snapshot.sourceLabel} · updated {formatRelativeTime(snapshot.lastUpdateAt, state.currentTime)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>Your stop</CardTitle>
                    <SimulatedTag label="ETA estimate" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stop-selector">ETA stop</Label>
                    <Select
                      id="stop-selector"
                      value={snapshot.selectedStop.id}
                      onChange={(event) => selectStop(event.target.value)}
                    >
                      {snapshot.route.stops.map((stop) => (
                        <option key={stop.id} value={stop.id}>
                          {stop.order}. {stop.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="rounded-2xl bg-navy-950 p-4 text-white">
                    <p className="text-xs font-semibold text-brand-200">Estimated arrival</p>
                    <p className="mt-1 text-4xl font-extrabold">
                      {snapshot.selectedStopEta.status === "unmapped" ? "Unavailable" : snapshot.busStatus === "offline" ? "Paused" : formatEta(snapshot.selectedStopEta.etaSeconds)}
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      {snapshot.selectedStopEta.status === "unmapped"
                        ? "This stop needs verified coordinates before an ETA can be calculated."
                        : snapshot.busStatus === "offline"
                          ? "Waiting for a fresh location update."
                          : `Around ${formatClock(snapshot.selectedStopEta.etaAt)} IST`}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px] text-white/60">
                      <span>{formatDistance(snapshot.selectedStopEta.distanceMeters)} to stop</span>
                      <span>{snapshot.selectedStopEta.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Bus</p>
                      <p className="mt-1 text-sm font-extrabold text-navy-950">
                        {snapshot.bus?.number ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Last update</p>
                      <p className="mt-1 text-sm font-extrabold text-navy-950">
                        {formatRelativeTime(snapshot.lastUpdateAt, state.currentTime)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sim speed</p>
                      <p className="mt-1 text-sm font-extrabold text-navy-950">
                        {Math.round(snapshot.route.averageSpeedKmh * snapshot.traffic.factor)} km/h
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Traffic</p>
                      <p className="mt-1 text-sm font-extrabold text-navy-950">
                        {snapshot.traffic.label}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Route progress</span>
                      <span>{Math.round(snapshot.progressPercent)}%</span>
                    </div>
                    <ProgressBar value={snapshot.progressPercent} className="bg-slate-100" />
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    <p className="mb-1 flex items-center gap-1.5 font-bold text-navy-900">
                      <Gauge className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      How this ETA is calculated
                    </p>
                    {describeEtaMethod(snapshot.route, snapshot.traffic)}
                  </div>

                  <ButtonLink href="/routes" variant="outline" className="w-full">
                    View all stops <ArrowUpRight className="h-4 w-4" />
                  </ButtonLink>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    Route endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <Badge tone="green">Start</Badge>
                    <p className="text-slate-700">{snapshot.route.startLocation}</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Badge tone="blue">End</Badge>
                    <p className="text-slate-700">{snapshot.route.destination}</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Badge tone="neutral">
                      <BusFront className="h-3 w-3" /> Bus
                    </Badge>
                    <p className="text-slate-700">
                      {snapshot.bus?.number ?? "No bus assigned"} · {snapshot.route.busNumber} in route data
                    </p>
                  </div>
                  {snapshot.simulation.delaySeconds > 0 && (
                    <Alert tone="warning">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {Math.round(snapshot.simulation.delaySeconds / 60)} minutes of simulated delay included.
                      </span>
                    </Alert>
                  )}
                  {snapshot.isStale && (
                    <Alert tone="error">
                      <span className="inline-flex items-center gap-1.5">
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        No fresh location update. Do not rely on the displayed ETA.
                      </span>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <SimulationControls />
            <UpcomingStops limit={7} />
          </div>
        </>
      )}
    </div>
  );
}
