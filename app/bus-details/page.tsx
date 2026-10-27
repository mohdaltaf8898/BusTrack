"use client";

import {
  BusFront,
  CalendarClock,
  Clock3,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Radio,
  ShieldCheck,
  UserRound,
  Wifi,
} from "lucide-react";
import { transportOffice } from "@/data/routes";
import { useApp } from "@/state/app-provider";
import { haversineMeters } from "@/lib/geo";
import {
  formatClock,
  formatCoordinates,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { RouteSelector } from "@/components/route-selector";
import { LiveMap } from "@/components/maps/live-map";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { SimulatedTag, SourceLabel, StatusPill } from "@/components/ui/labels";

export default function BusDetailsPage() {
  const { state, snapshot, selectStop } = useApp();
  const canViewDriverContact =
    state.user?.role === "admin" || state.user?.role === "driver";
  const nearestStop = snapshot.route.stops.reduce((closest, stop) => {
    const distance = haversineMeters(snapshot.busPosition, { lat: stop.lat, lng: stop.lng });
    return distance < closest.distance ? { stop, distance } : closest;
  }, {
    stop: snapshot.route.stops[0],
    distance: Number.POSITIVE_INFINITY,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Bus details"
        title="Vehicle & service information"
        description="Assigned route, trip state, last reported position and placeholder transport contacts."
        actions={
          <div className="w-full sm:w-64">
            <RouteSelector />
          </div>
        }
      />

      <Alert tone="info">
        <div className="flex flex-wrap items-center gap-2">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            All contact details on this page are placeholders. No real college phone numbers or driver identities are used.
          </span>
          <SimulatedTag label="Prototype data" />
        </div>
      </Alert>

      {!snapshot.bus ? (
        <EmptyState
          icon={<BusFront className="h-6 w-6" />}
          title="No bus assigned to this route"
          description="An administrator can assign a bus from the admin dashboard."
        />
      ) : (
        <>
          <Card className="overflow-hidden border-0 bg-navy-950 text-white">
            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-brand-200">
                  <BusFront className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Bus number</p>
                  <p className="text-3xl font-extrabold">{snapshot.bus.number}</p>
                  <p className="mt-1 text-sm text-white/65">{snapshot.route.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={snapshot.busStatus} />
                <Badge tone="navy" className="bg-white/10 text-white ring-white/10">
                  {snapshot.route.code}
                </Badge>
                <SourceLabel mode={snapshot.dataMode} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Last reported location</CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  {snapshot.isStale ? "Last known position — updates have stopped." : "Current generated position."}
                </p>
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
                  showControls={false}
                  className="h-[300px] md:h-[350px]"
                />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Coordinates
                    </p>
                    <p className="mt-1 font-mono text-xs font-bold text-navy-950">
                      {formatCoordinates(snapshot.busPosition.lat, snapshot.busPosition.lng)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <Radio className="h-3.5 w-3.5" aria-hidden="true" /> Nearest demo stop
                    </p>
                    <p className="mt-1 text-sm font-bold text-navy-950">{nearestStop.stop.name}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Last update
                    </p>
                    <p className="mt-1 text-sm font-bold text-navy-950">
                      {formatRelativeTime(snapshot.lastUpdateAt, state.currentTime)}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDateTime(snapshot.lastUpdateAt)} IST</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <Wifi className="h-3.5 w-3.5" aria-hidden="true" /> Source
                    </p>
                    <p className="mt-1 text-sm font-bold text-navy-950">{snapshot.sourceLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Trip & service</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="text-slate-500">Trip status</span>
                    <Badge tone={snapshot.simulation.tripStatus === "active" ? "green" : "neutral"}>
                      {snapshot.simulation.tripStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="text-slate-500">Location sharing</span>
                    <Badge tone={snapshot.simulation.isSharing ? "blue" : "neutral"}>
                      {snapshot.simulation.isSharing ? "On during trip" : "Stopped"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="text-slate-500">Trip started</span>
                    <span className="font-bold text-navy-950">
                      {snapshot.simulation.startedAt
                        ? `${formatClock(snapshot.simulation.startedAt)} IST`
                        : "Not started"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="text-slate-500">Capacity / model</span>
                    <span className="font-bold text-navy-950">
                      {snapshot.bus.capacity} seats · {snapshot.bus.model}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-navy-900">
                      <CalendarClock className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      Service availability
                    </p>
                    <p className="text-xs leading-5 text-slate-600">{snapshot.bus.serviceAvailability}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-navy-900">
                      <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      Privacy
                    </p>
                    <p className="text-xs leading-5 text-slate-600">
                      In real GPS mode, driver locations are stored only for authorized active trips with sharing
                      enabled. Sharing stops automatically when a trip ends.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="rounded-2xl border border-slate-100 p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 font-bold text-navy-950">
                        <UserRound className="h-4 w-4 text-brand-600" aria-hidden="true" />
                        Driver
                      </p>
                      {!canViewDriverContact && (
                        <Badge tone="neutral">
                          <LockKeyhole className="h-3 w-3" /> Restricted
                        </Badge>
                      )}
                    </div>
                    {canViewDriverContact ? (
                      <div className="space-y-1.5 text-slate-600">
                        <p className="font-semibold text-navy-950">
                          {snapshot.driver?.name ?? "Awaiting assignment"}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs">
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                          {snapshot.driver?.email ?? "unassigned@example.edu"}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs">
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          {snapshot.driver?.phone ?? "+91 XXXXX XXXXX (placeholder)"}
                        </p>
                        <p className="text-xs">{snapshot.driver?.shift ?? "Shift not configured"}</p>
                      </div>
                    ) : (
                      <p className="text-xs leading-5 text-slate-600">
                        Driver contact details are visible only to transport staff. Students should contact the
                        transport office below.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-100 p-3.5">
                    <p className="mb-2 flex items-center gap-1.5 font-bold text-navy-950">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      {transportOffice.name}
                    </p>
                    <div className="space-y-1.5 text-slate-600">
                      <p className="flex items-center gap-1.5 text-xs">
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        <a href={`mailto:${transportOffice.email}`} className="text-brand-700 hover:underline">
                          {transportOffice.email}
                        </a>
                      </p>
                      <p className="flex items-center gap-1.5 text-xs">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {transportOffice.phone}
                      </p>
                      <p className="text-xs">{transportOffice.hours}</p>
                      <p className="text-xs">{transportOffice.address}</p>
                    </div>
                  </div>

                  <ButtonLink href="/login" variant="outline" className="w-full">
                    {state.user ? "Switch account / role" : "Sign in for staff contacts"}
                  </ButtonLink>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
