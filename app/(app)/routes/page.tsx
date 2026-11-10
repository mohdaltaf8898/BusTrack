"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusFront,
  Clock3,
  Navigation,
  Route as RouteIcon,
  Search,
  Timer,
  UserRound,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useApp } from "@/state/app-provider";
import { TIMETABLE_SOURCE_URL } from "@/data/routes";
import { formatClock, formatEta, formatScheduledTime } from "@/lib/format";
import { DURATION, EASE_OUT, SPRING, TAP_SOFT } from "@/lib/motion";
import { RouteAccuracyNote } from "@/components/maps/route-accuracy-note";
import {
  PullToRefresh,
  RefreshButton,
} from "@/components/motion/pull-to-refresh";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { PageHeader } from "@/components/page-header";
import { RouteCard } from "@/components/routes/route-card";
import { RoutePreview } from "@/components/routes/route-preview";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { SimulatedTag } from "@/components/ui/labels";
import { cn } from "@/lib/utils";

const stopRowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
};

export default function RoutesPage() {
  const { state, snapshot, selectRoute, selectStop, refreshBackendData } =
    useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const trackRoute = useCallback(
    (routeId: string) => {
      selectRoute(routeId);
      router.push("/track");
    },
    [router, selectRoute],
  );
  const chooseRoute = useCallback(
    (routeId: string) => {
      selectRoute(routeId);
      document
        .getElementById("route-stop-list")
        ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    },
    [selectRoute],
  );
  const filteredRoutes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return state.routes;
    return state.routes.filter((route) =>
      [
        route.code,
        route.name,
        route.busNumber,
        route.startLocation,
        route.destination,
        ...route.stops.map((stop) => stop.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, state.routes]);
  const selectedGeometry = snapshot.geometry;

  return (
    <PullToRefresh onRefresh={refreshBackendData} disabled={!state.isOnline}>
      <RevealGroup trigger="mount" stagger={0.07} className="space-y-5">
        <RevealItem variant="small">
          <PageHeader
            eyebrow="Routes & stops"
            title="Choose your route"
            description="Browse the 16 morning pickup routes from the 2025–26 college timetable, then select a stop for its simulated ETA."
            actions={
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={refreshBackendData}
                  className="hidden sm:inline-flex"
                />
                <ButtonLink href="/track" variant="primary">
                  <Navigation className="h-4 w-4" /> Track selected bus
                </ButtonLink>
              </div>
            }
          />
        </RevealItem>

        <RevealItem variant="small">
          <Alert tone="info">
            <span>
              Pickup order and times are transcribed from the{" "}
              <a
                href={TIMETABLE_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline underline-offset-2"
              >
                2025–26 route document
              </a>
              . The route list has been reported as unchanged, but the listed
              pickup times are from 2025–26 and have not been independently
              confirmed. Please check times and pickup points with the transport
              office. SIM-* vehicles are placeholders; positions are simulated
              unless marked as device GPS, and ETAs use simulated traffic.
            </span>
          </Alert>
        </RevealItem>

        <RevealItem
          variant="small"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
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
        </RevealItem>

        <RevealItem>
          {filteredRoutes.length === 0 ? (
            <EmptyState
              icon={<RouteIcon className="h-7 w-7" strokeWidth={1.5} />}
              title="No routes match your search"
              description="Try a route code, bus number, area name, or clear the search field."
              action={
                <Button onClick={() => setQuery("")}>Clear search</Button>
              }
            />
          ) : (
            <section aria-labelledby="all-routes-heading">
              <div className="mb-3 flex items-end justify-between gap-3 px-1">
                <div>
                  <h2
                    id="all-routes-heading"
                    className="text-base font-semibold text-navy-950"
                  >
                    All routes
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    2025–26 timetable · tap a route for a summary, select it to
                    inspect its stops below.
                  </p>
                </div>
                <p className="hidden shrink-0 text-xs text-slate-500 sm:block">
                  Swipe right to select · left to track
                </p>
              </div>
              <m.div layout className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {filteredRoutes.map((route) => (
                    <m.div
                      key={route.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{
                        duration: DURATION.fast,
                        ease: EASE_OUT,
                        layout: SPRING.gentle,
                      }}
                    >
                      <RouteCard
                        route={route}
                        selected={route.id === state.selectedRouteId}
                        expanded={expandedRouteId === route.id}
                        onToggle={() =>
                          setExpandedRouteId((current) =>
                            current === route.id ? null : route.id,
                          )
                        }
                        onSelect={() => chooseRoute(route.id)}
                        onTrack={() => trackRoute(route.id)}
                      />
                    </m.div>
                  ))}
                </AnimatePresence>
              </m.div>
            </section>
          )}
        </RevealItem>

        {state.routes.length > 0 && (
          <RevealItem
            id="route-stop-list"
            className="grid grid-cols-1 scroll-mt-20 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"
          >
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Ordered stops · {snapshot.route.code}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    The line shows pickup order, not a verified driving path.
                    Times are from 2025–26; select a stop for a simulated ETA.
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
                <m.ol
                  key={snapshot.route.id}
                  className="relative space-y-2"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.035 } },
                  }}
                >
                  {snapshot.stopEtas.map((item) => {
                    const selected = item.isSelected;
                    return (
                      <m.li key={item.stop.id} variants={stopRowVariants}>
                        <m.button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => selectStop(item.stop.id)}
                          whileTap={TAP_SOFT}
                          transition={SPRING.tap}
                          className={cn(
                            "relative flex min-h-[66px] w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                            selected
                              ? "border-brand-200 bg-brand-50"
                              : "border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          <m.span
                            className={cn(
                              "relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                              selected
                                ? "border-brand-600 bg-brand-600 text-white shadow-glow"
                                : "border-brand-300 bg-white text-brand-700",
                            )}
                            animate={{ scale: selected ? 1.08 : 1 }}
                            transition={SPRING.gentle}
                          >
                            {item.stop.order}
                          </m.span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-bold text-navy-950">
                              {item.stop.name}
                            </span>
                            <span className="mt-0.5 block text-xs tabular-nums text-slate-500">
                              {snapshot.route.scheduleYear ?? "Schedule"}{" "}
                              {item.stop.order ===
                                snapshot.route.stops.length &&
                              item.stop.name === "Lords College"
                                ? "arrival"
                                : "pickup"}
                              {": "}
                              {formatScheduledTime(item.stop.scheduledTime)}
                              {item.stop.lat == null
                                ? ", location pending"
                                : ", approximate map location"}
                            </span>
                            {item.stop.note && (
                              <span className="mt-0.5 block text-xs text-amber-700">
                                {item.stop.note}
                              </span>
                            )}
                          </span>
                          <span className="text-right">
                            <span className="block text-sm font-semibold text-navy-950">
                              {item.status === "departed"
                                ? "Passed"
                                : formatEta(item.etaSeconds)}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {item.status === "unmapped"
                                ? "No map position"
                                : item.status === "departed"
                                  ? "Departed"
                                  : `Simulated · ${formatClock(item.etaAt)}`}
                            </span>
                          </span>
                        </m.button>
                      </m.li>
                    );
                  })}
                  {/* Pickup-order connector, drawn as the list settles. */}
                  <m.span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-8 left-[28px] top-8 z-10 w-px origin-top bg-brand-300"
                    variants={{
                      hidden: { scaleY: 0 },
                      visible: {
                        scaleY: 1,
                        transition: { duration: DURATION.long, ease: EASE_OUT },
                      },
                    }}
                  />
                </m.ol>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Selected route details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-navy-950 p-4 text-white">
                    <p className="text-xs text-white/55">
                      Route ID · {snapshot.route.code}
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {snapshot.route.name}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/65">
                      {snapshot.route.description}
                    </p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2.5">
                      <BusFront
                        className="mt-0.5 h-4 w-4 text-brand-600"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold text-navy-950">
                          {snapshot.bus?.number.startsWith("SIM-")
                            ? "Simulation vehicle"
                            : "Vehicle"}
                        </p>
                        <p className="text-slate-600">
                          {snapshot.bus?.number ?? "Not assigned"}
                          {snapshot.bus?.capacity != null
                            ? ` · ${snapshot.bus.capacity} seats`
                            : " · Capacity not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <UserRound
                        className="mt-0.5 h-4 w-4 text-brand-600"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold text-navy-950">
                          Assigned driver
                        </p>
                        <p className="text-slate-600">
                          {snapshot.driver?.name ?? "No driver assigned yet"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Timer
                        className="mt-0.5 h-4 w-4 text-brand-600"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold text-navy-950">
                          2025–26 timetable span
                        </p>
                        <p className="text-slate-600">
                          {snapshot.route.scheduledDurationMinutes == null
                            ? "Not listed"
                            : `${snapshot.route.scheduledDurationMinutes} min between first pickup and college`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Clock3
                        className="mt-0.5 h-4 w-4 text-brand-600"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold text-navy-950">
                          Operating status
                        </p>
                        <p className="text-slate-600 capitalize">
                          {snapshot.route.status} ·{" "}
                          {snapshot.bus?.serviceAvailability ??
                            "Service hours not configured"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ButtonLink
                    href="/bus-details"
                    variant="outline"
                    className="w-full"
                  >
                    View bus details
                  </ButtonLink>
                </CardContent>
              </Card>
              <Alert tone="warning" title="Map accuracy">
                <RouteAccuracyNote route={snapshot.route} />
              </Alert>
            </div>
          </RevealItem>
        )}
      </RevealGroup>
    </PullToRefresh>
  );
}
