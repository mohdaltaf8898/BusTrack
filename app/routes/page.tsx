"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BusFront,
  Clock3,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  Timer,
  UserRound,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { TIMETABLE_SOURCE_URL } from "@/data/routes";
import { buildRouteGeometry } from "@/lib/geo";
import { formatClock, formatDistance, formatEta, formatScheduledTime } from "@/lib/format";
import { RouteAccuracyNote } from "@/components/maps/route-accuracy-note";
import { PageHeader } from "@/components/page-header";
import { RoutePreview } from "@/components/routes/route-preview";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { SimulatedTag, StatusPill } from "@/components/ui/labels";
import { cn } from "@/lib/utils";

export default function RoutesPage() {
  const { state, snapshot, selectRoute, selectStop, getRouteSnapshot } = useApp();
  const [query, setQuery] = useState("");
  const filteredRoutes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return state.routes;
    return state.routes.filter((route) =>
      [route.code, route.name, route.busNumber, route.startLocation, route.destination, ...route.stops.map((stop) => stop.name)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, state.routes]);
  const selectedGeometry = snapshot.geometry;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Routes & stops"
        title="Choose your route"
        description="Browse the 16 morning pickup routes from the 2025–26 college timetable, then select a stop for its simulated ETA."
        actions={
          <ButtonLink href="/track" variant="primary">
            <Navigation className="h-4 w-4" /> Track selected bus
          </ButtonLink>
        }
      />

      <Alert tone="info">
        <span>
          Pickup order and times are transcribed from the{" "}
          <a href={TIMETABLE_SOURCE_URL} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">
            2025–26 route document
          </a>. The route list has been reported as unchanged, but the listed pickup times are from 2025–26 and have not been independently confirmed. Please check times and pickup points with the transport office.
          SIM-* vehicles are placeholders; positions are simulated unless marked as device GPS, and ETAs use simulated traffic.
        </span>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search routes or stops"
            aria-label="Search routes or stops"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-slate-500">
          {filteredRoutes.length} of {state.routes.length} routes shown
        </p>
      </div>

      {filteredRoutes.length === 0 ? (
        <EmptyState
          icon={<RouteIcon className="h-6 w-6" />}
          title="No routes match your search"
          description="Try a route code, bus number, area name, or clear the search field."
          action={<Button onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRoutes.map((route) => {
            const routeSnapshot = getRouteSnapshot(route.id);
            const bus = state.buses.find((item) => item.routeId === route.id);
            const selected = route.id === state.selectedRouteId;
            const geometry = buildRouteGeometry(route);
            return (
              <Card
                key={route.id}
                className={cn(
                  "overflow-hidden transition",
                  selected ? "border-brand-300 ring-2 ring-brand-100" : "hover:border-slate-200",
                )}
              >
                <div className="h-1.5 w-full" style={{ backgroundColor: route.color }} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="blue">{route.code}</Badge>
                        <Badge tone="neutral">{route.scheduleYear ?? "Custom route"}</Badge>
                      </div>
                      <CardTitle className="mt-2 truncate">{route.name}</CardTitle>
                    </div>
                    <StatusPill status={routeSnapshot.busStatus} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RoutePreview
                    route={route}
                    geometry={geometry}
                    selectedStopId={selected ? snapshot.selectedStop.id : undefined}
                    className="h-32"
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{route.busNumber.startsWith("SIM-") ? "Simulation vehicle" : "Vehicle"}</p>
                      <p className="mt-0.5 font-extrabold text-navy-950">{bus?.number ?? route.busNumber}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Timetable span</p>
                      <p className="mt-0.5 font-extrabold text-navy-950">
                        {route.scheduledDurationMinutes == null ? "Not listed" : `${route.scheduledDurationMinutes} min`}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Approx. distance</p>
                      <p className="mt-0.5 font-extrabold text-navy-950">
                        {formatDistance(geometry.totalDistanceMeters)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Stops</p>
                      <p className="mt-0.5 font-extrabold text-navy-950">{route.stops.length}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      <span className="truncate">{route.startLocation}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                      <span className="truncate">{route.destination}</span>
                    </p>
                  </div>
                  <Button
                    variant={selected ? "soft" : "outline"}
                    className="w-full"
                    aria-pressed={selected}
                    onClick={() => {
                      selectRoute(route.id);
                      document.getElementById("route-stop-list")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {selected ? "Selected route" : "Select route"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {state.routes.length > 0 && (
        <div id="route-stop-list" className="grid grid-cols-1 scroll-mt-20 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Ordered stops · {snapshot.route.code}</CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  The listed pickup times are from 2025–26, not live arrival times. Select a stop for its simulated ETA.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone="blue">{snapshot.route.stops.length} stops</Badge>
                <SimulatedTag label="ETAs" />
              </div>
            </CardHeader>
            <CardContent>
              <RoutePreview
                route={snapshot.route}
                geometry={selectedGeometry}
                selectedStopId={snapshot.selectedStop.id}
                className="mb-4 h-48"
              />
              <ol className="space-y-2">
                {snapshot.stopEtas.map((item) => {
                  const selected = item.isSelected;
                  return (
                    <li key={item.stop.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectStop(item.stop.id)}
                        className={cn(
                          "flex min-h-[66px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                          selected
                            ? "border-brand-200 bg-brand-50"
                            : "border-slate-100 hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                            selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {item.stop.order}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-bold text-navy-950">
                            {item.stop.name}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {snapshot.route.scheduleYear ?? "Schedule"}{" "}
                            {item.stop.order === snapshot.route.stops.length && item.stop.name === "Lords College" ? "arrival" : "pickup"}: {formatScheduledTime(item.stop.scheduledTime)}
                            {item.stop.lat == null ? " · Location pending" : " · Approx. map location"}
                          </span>
                          {item.stop.note && <span className="mt-0.5 block text-[11px] text-amber-700">{item.stop.note}</span>}
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-extrabold text-navy-950">
                            {item.status === "departed" ? "Passed" : formatEta(item.etaSeconds)}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {item.status === "unmapped" ? "No map position" : item.status === "departed" ? "Departed" : `Simulated · ${formatClock(item.etaAt)}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Selected route details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-navy-950 p-4 text-white">
                  <p className="text-xs text-white/55">Route ID · {snapshot.route.code}</p>
                  <p className="mt-1 text-lg font-extrabold">{snapshot.route.name}</p>
                  <p className="mt-2 text-xs leading-5 text-white/65">{snapshot.route.description}</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <BusFront className="mt-0.5 h-4 w-4 text-brand-600" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-navy-950">{snapshot.bus?.number.startsWith("SIM-") ? "Simulation vehicle" : "Vehicle"}</p>
                      <p className="text-slate-600">
                        {snapshot.bus?.number ?? "Not assigned"}
                        {snapshot.bus?.capacity != null ? ` · ${snapshot.bus.capacity} seats` : " · Capacity not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <UserRound className="mt-0.5 h-4 w-4 text-brand-600" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-navy-950">Assigned driver</p>
                      <p className="text-slate-600">{snapshot.driver?.name ?? "Awaiting assignment (demo)"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Timer className="mt-0.5 h-4 w-4 text-brand-600" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-navy-950">2025–26 timetable span</p>
                      <p className="text-slate-600">
                        {snapshot.route.scheduledDurationMinutes == null ? "Not listed" : `${snapshot.route.scheduledDurationMinutes} min between first pickup and college`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock3 className="mt-0.5 h-4 w-4 text-brand-600" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-navy-950">Operating status</p>
                      <p className="text-slate-600 capitalize">
                        {snapshot.route.status} · {snapshot.bus?.serviceAvailability ?? "Service hours not configured"}
                      </p>
                    </div>
                  </div>
                </div>
                <ButtonLink href="/bus-details" variant="outline" className="w-full">
                  View bus details
                </ButtonLink>
              </CardContent>
            </Card>
            <Alert tone="warning" title="Map accuracy">
              <RouteAccuracyNote route={snapshot.route} />
            </Alert>
          </div>
        </div>
      )}
    </div>
  );
}
