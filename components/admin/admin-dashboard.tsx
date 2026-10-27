"use client";

import { useState } from "react";
import {
  Activity,
  BusFront,
  Database,
  Gauge,
  MapPin,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/admin/data-table";
import {
  BusFormDialog,
  DelayReportDialog,
  DriverAssignmentDialog,
  RouteFormDialog,
  StopFormDialog,
} from "@/components/admin/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Alert, EmptyState, ProgressBar } from "@/components/ui/feedback";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { DemoModeBadge, SimulatedTag, StatusPill } from "@/components/ui/labels";
import {
  formatDateTime,
  formatRelativeTime,
} from "@/lib/format";
import type { Bus, Route, Stop } from "@/lib/types";

type AdminTab =
  | "overview"
  | "buses"
  | "routes"
  | "stops"
  | "drivers"
  | "trips"
  | "delays"
  | "health";

type AdminFormState =
  | { type: "bus"; editing: Bus | null }
  | { type: "route"; editing: Route | null }
  | {
      type: "stop";
      editing: { id: string; routeId: string; stop: Stop } | null;
    }
  | { type: "assignment"; bus: Bus }
  | { type: "delay" }
  | null;

type ConfirmState = {
  type: "bus" | "route" | "stop" | "delay";
  id: string;
  label: string;
  routeId?: string;
} | null;

interface HealthRow {
  id: string;
  bus: string;
  route: string;
  source: string;
  lastUpdate: number;
  condition: "Fresh" | "Stale" | "Offline";
  sharing: boolean;
  progress: number;
  status: string;
}

interface TripRow {
  id: string;
  bus: string;
  route: string;
  routeId: string;
  status: string;
  startedAt: number;
  endedAt: number | null;
  sharing: boolean;
  lastUpdate: number;
  progress: number;
  source: string;
}

const statusFilter = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "maintenance", label: "Maintenance" },
];

function badgeForStatus(status: string) {
  if (status === "active") return <Badge tone="green" dot>Active</Badge>;
  if (status === "scheduled") return <Badge tone="amber" dot>Scheduled</Badge>;
  if (status === "maintenance") return <Badge tone="rose" dot>Maintenance</Badge>;
  if (status === "completed") return <Badge tone="blue" dot>Completed</Badge>;
  if (status === "offline") return <Badge tone="neutral" dot>Offline</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}

export function AdminDashboard() {
  const {
    state,
    config,
    getRouteSnapshot,
    clearError,
    refreshBackendData,
    saveBus,
    deleteBus,
    saveRoute,
    deleteRoute,
    saveStop,
    deleteStop,
    assignDriver,
    endTripAsAdmin,
    reportDelay,
    deleteDelayReport,
  } = useApp();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [form, setForm] = useState<AdminFormState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busFilter, setBusFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [stopRouteFilter, setStopRouteFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [tripFilter, setTripFilter] = useState("all");
  const [delayFilter, setDelayFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");

  const isBackendAdmin = config.publicConfigured && state.user?.provider === "supabase";
  // getRouteSnapshot reads the latest provider state; recomputing here keeps
  // admin health and progress synchronized with the one-second engine tick.
  const routeSnapshots = state.routes.map((route) => getRouteSnapshot(route.id));
  const snapshotByRoute = new Map(
    routeSnapshots.map((snapshot) => [snapshot.route.id, snapshot]),
  );
  const totalStops = state.routes.reduce((sum, route) => sum + route.stops.length, 0);
  const activeTrips = routeSnapshots.filter(
    (snapshot) => snapshot.simulation.tripStatus === "active",
  ).length;
  const staleCount = routeSnapshots.filter(
    (snapshot) => snapshot.isStale || snapshot.busStatus === "offline",
  ).length;

  const healthRows: HealthRow[] = state.buses.map((bus) => {
    const snapshot = snapshotByRoute.get(bus.routeId);
    const route = state.routes.find((item) => item.id === bus.routeId);
    const condition: HealthRow["condition"] = !snapshot
      ? "Offline"
      : snapshot.isStale || snapshot.busStatus === "offline"
        ? "Stale"
        : "Fresh";
    return {
      id: bus.id,
      bus: bus.number,
      route: route ? `${route.code} · ${route.name}` : "Unassigned",
      source: snapshot?.sourceLabel ?? "Unavailable",
      lastUpdate: snapshot?.lastUpdateAt ?? state.currentTime,
      condition,
      sharing: snapshot?.simulation.isSharing ?? false,
      progress: snapshot?.progressPercent ?? 0,
      status: snapshot?.busStatus ?? "offline",
    };
  });

  const backendTripRows: TripRow[] = state.backendTrips.map((trip) => {
    const bus = state.buses.find((item) => item.id === trip.busId);
    const route = state.routes.find((item) => item.id === trip.routeId);
    const snapshot = snapshotByRoute.get(trip.routeId);
    return {
      id: trip.id,
      bus: bus?.number ?? trip.busId,
      route: route ? `${route.code} · ${route.name}` : trip.routeId,
      routeId: trip.routeId,
      status: trip.status,
      startedAt: trip.startedAt,
      endedAt: trip.endedAt,
      sharing: trip.sharingEnabled,
      lastUpdate: trip.lastLocationAt ?? trip.startedAt,
      progress: snapshot?.progressPercent ?? 0,
      source: "Supabase",
    };
  });

  const demoTripRows: TripRow[] = state.routes.map((route) => {
    const snapshot = snapshotByRoute.get(route.id);
    const simulation = snapshot?.simulation;
    return {
      id: `demo-trip-${route.id}`,
      bus: snapshot?.bus?.number ?? route.busNumber,
      route: `${route.code} · ${route.name}`,
      routeId: route.id,
      status: simulation?.tripStatus ?? "idle",
      startedAt: simulation?.startedAt ?? state.currentTime,
      endedAt: simulation?.endedAt ?? null,
      sharing: simulation?.isSharing ?? false,
      lastUpdate: simulation?.lastUpdateAt ?? state.currentTime,
      progress: snapshot?.progressPercent ?? 0,
      source: "Simulation",
    };
  });
  const tripRows = isBackendAdmin && backendTripRows.length > 0 ? backendTripRows : demoTripRows;

  const runAction = async (operation: () => Promise<void>, message: string) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    clearError();
    try {
      await operation();
      setSuccess(message);
      setForm(null);
      setConfirm(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The operation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: TabItem<AdminTab>[] = [
    { id: "overview", label: "Overview" },
    { id: "buses", label: "Buses", count: state.buses.length },
    { id: "routes", label: "Routes", count: state.routes.length },
    { id: "stops", label: "Stops", count: totalStops },
    { id: "drivers", label: "Drivers" },
    { id: "trips", label: "Trips", count: activeTrips },
    { id: "delays", label: "Delays", count: state.delayReports.length },
    { id: "health", label: "Health" },
  ];

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Routes", value: state.routes.length, Icon: RouteIcon, tone: "bg-brand-50 text-brand-700" },
          { label: "Buses", value: state.buses.length, Icon: BusFront, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Stops", value: totalStops, Icon: MapPin, tone: "bg-violet-50 text-violet-700" },
          { label: "Active trips", value: activeTrips, Icon: Activity, tone: "bg-amber-50 text-amber-700" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                <item.Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-2xl font-extrabold text-navy-950">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Route health snapshot</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Generated from the same simulation state used on student maps.
              </p>
            </div>
            <SimulatedTag label="Demo telemetry" />
          </CardHeader>
          <CardContent className="space-y-4">
            {routeSnapshots.length === 0 ? (
              <EmptyState title="No routes" description="Add a route to see health metrics." />
            ) : (
              routeSnapshots.map((snapshot) => (
                <div key={snapshot.route.id} className="rounded-2xl border border-slate-100 p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-navy-950">
                        {snapshot.route.code} · {snapshot.bus?.number ?? "No bus"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {snapshot.sourceLabel} · {formatRelativeTime(snapshot.lastUpdateAt, state.currentTime)}
                      </p>
                    </div>
                    <StatusPill status={snapshot.busStatus} />
                  </div>
                  <ProgressBar value={snapshot.progressPercent} className="bg-slate-100" />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{Math.round(snapshot.progressPercent)}% complete</span>
                    <span>{snapshot.traffic.label} simulated traffic</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Backend & authorization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Mode</span>
                <Badge tone={isBackendAdmin ? "green" : "amber"}>
                  {isBackendAdmin ? "Supabase API" : "Local demo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Signed-in role</span>
                <Badge tone="blue">{state.user?.role}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Realtime</span>
                <Badge tone={state.realtimeStatus === "connected" ? "green" : "neutral"}>
                  {state.realtimeStatus}
                </Badge>
              </div>
              <p className="text-xs leading-5 text-slate-600">{state.backendMessage}</p>
              {isBackendAdmin && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    void runAction(refreshBackendData, "Supabase data was refreshed.")
                  }
                  loading={actionLoading}
                >
                  <RefreshCw className="h-4 w-4" /> Refresh backend data
                </Button>
              )}
              {!isBackendAdmin && (
                <Alert tone="info">
                  Missing backend credentials or a demo admin session. Changes stay in this browser and are clearly
                  labelled as local demonstration data.
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick management</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" onClick={() => setForm({ type: "bus", editing: null })}>
                <Plus className="h-4 w-4" /> Add bus
              </Button>
              <Button variant="outline" onClick={() => setForm({ type: "route", editing: null })}>
                <Plus className="h-4 w-4" /> Add route
              </Button>
              <Button variant="outline" onClick={() => setForm({ type: "stop", editing: null })}>
                <Plus className="h-4 w-4" /> Add stop
              </Button>
              <Button variant="outline" onClick={() => setForm({ type: "delay" })}>
                <TriangleAlert className="h-4 w-4" /> Report delay
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {staleCount > 0 && (
        <Alert tone="warning" title={`${staleCount} bus${staleCount === 1 ? "" : "es"} need attention`}>
          Open the Health tab to inspect stale or offline location updates.
        </Alert>
      )}
    </div>
  );

  const renderBuses = () => {
    const rows = state.buses.filter(
      (bus) => busFilter === "all" || bus.status === busFilter,
    );
    const columns: Column<Bus>[] = [
      {
        key: "number",
        header: "Bus",
        cell: (bus) => (
          <span className="font-extrabold text-navy-950">{bus.number}</span>
        ),
      },
      {
        key: "route",
        header: "Route",
        cell: (bus) => {
          const route = state.routes.find((item) => item.id === bus.routeId);
          return route ? `${route.code} · ${route.name}` : "Unassigned";
        },
      },
      {
        key: "driver",
        header: "Driver",
        cell: (bus) =>
          state.drivers.find((driver) => driver.id === bus.driverId)?.name ?? "Unassigned",
      },
      { key: "capacity", header: "Capacity", cell: (bus) => `${bus.capacity} seats` },
      { key: "status", header: "Status", cell: (bus) => badgeForStatus(bus.status) },
      { key: "model", header: "Model", cell: (bus) => bus.model, hideOnMobile: true },
    ];
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Buses</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Assign routes, drivers and operating status.</p>
          </div>
          <Button onClick={() => setForm({ type: "bus", editing: null })}>
            <Plus className="h-4 w-4" /> Add bus
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder="Search bus number, route, driver or model"
            searchValue={(bus, query) =>
              [
                bus.number,
                bus.model,
                bus.status,
                state.routes.find((route) => route.id === bus.routeId)?.name ?? "",
                state.drivers.find((driver) => driver.id === bus.driverId)?.name ?? "",
              ]
                .join(" ")
                .toLowerCase()
                .includes(query)
            }
            filterOptions={statusFilter}
            filterValue={busFilter}
            onFilterChange={setBusFilter}
            filterLabel="Filter bus status"
            onEdit={(bus) => setForm({ type: "bus", editing: bus })}
            onDelete={(bus) =>
              setConfirm({ type: "bus", id: bus.id, label: `bus ${bus.number}` })
            }
            rowLabel={(bus) => bus.number}
            emptyTitle="No buses found"
            emptyDescription="Change the filter or add a bus to the demo catalog."
          />
        </CardContent>
      </Card>
    );
  };

  const renderRoutes = () => {
    const rows = state.routes.filter(
      (route) => routeFilter === "all" || route.status === routeFilter,
    );
    const columns: Column<Route>[] = [
      {
        key: "code",
        header: "ID",
        cell: (route) => <Badge tone="blue">{route.code}</Badge>,
      },
      { key: "name", header: "Route", cell: (route) => <span className="font-bold">{route.name}</span> },
      { key: "bus", header: "Bus", cell: (route) => route.busNumber },
      {
        key: "endpoints",
        header: "Endpoints",
        cell: (route) => `${route.startLocation} → ${route.destination}`,
      },
      { key: "stops", header: "Stops", cell: (route) => route.stops.length },
      {
        key: "duration",
        header: "Duration",
        cell: (route) => `${route.estimatedDurationMinutes} min`,
      },
      { key: "status", header: "Status", cell: (route) => badgeForStatus(route.status) },
    ];
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Routes</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Metadata and status for every sample route.</p>
          </div>
          <Button onClick={() => setForm({ type: "route", editing: null })}>
            <Plus className="h-4 w-4" /> Add route
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder="Search route ID, bus, endpoint or description"
            searchValue={(route, query) =>
              [
                route.code,
                route.name,
                route.busNumber,
                route.startLocation,
                route.destination,
                route.description,
              ]
                .join(" ")
                .toLowerCase()
                .includes(query)
            }
            filterOptions={statusFilter}
            filterValue={routeFilter}
            onFilterChange={setRouteFilter}
            filterLabel="Filter route status"
            onEdit={(route) => setForm({ type: "route", editing: route })}
            onDelete={(route) =>
              setConfirm({ type: "route", id: route.id, label: `route ${route.code}` })
            }
            rowLabel={(route) => route.name}
            emptyTitle="No routes found"
            emptyDescription="Change the filter or add a route using a geometry template."
          />
        </CardContent>
      </Card>
    );
  };

  const flattenedStops = state.routes.flatMap((route) =>
    route.stops.map((stop) => ({ ...stop, id: `${route.id}:${stop.id}`, routeId: route.id })),
  );
  type StopRow = (typeof flattenedStops)[number];

  const renderStops = () => {
    const rows = flattenedStops.filter(
      (stop) => stopRouteFilter === "all" || stop.routeId === stopRouteFilter,
    );
    const columns: Column<StopRow>[] = [
      {
        key: "order",
        header: "Order",
        cell: (stop) => (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-700">
            {stop.order}
          </span>
        ),
      },
      { key: "name", header: "Stop", cell: (stop) => <span className="font-bold">{stop.name}</span> },
      {
        key: "route",
        header: "Route",
        cell: (stop) =>
          state.routes.find((route) => route.id === stop.routeId)?.code ?? stop.routeId,
      },
      {
        key: "coordinates",
        header: "Coordinates",
        cell: (stop) => (
          <span className="font-mono text-xs">
            {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
          </span>
        ),
      },
      { key: "landmark", header: "Landmark", cell: (stop) => stop.landmark ?? "—" },
    ];
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Stops</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Ordered geographic vertices used by the simulation.</p>
          </div>
          <Button onClick={() => setForm({ type: "stop", editing: null })}>
            <Plus className="h-4 w-4" /> Add stop
          </Button>
        </CardHeader>
        <CardContent>
          <Alert tone="warning" className="mb-4">
            Saving or deleting a stop rebuilds the demo polyline from ordered stop coordinates. Detailed road-shape
            points are replaced with straight links.
          </Alert>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder="Search stop name, landmark or coordinates"
            searchValue={(stop, query) =>
              [stop.name, stop.landmark, String(stop.lat), String(stop.lng)]
                .join(" ")
                .toLowerCase()
                .includes(query)
            }
            filterOptions={[
              { value: "all", label: "All routes" },
              ...state.routes.map((route) => ({
                value: route.id,
                label: `${route.code} · ${route.name}`,
              })),
            ]}
            filterValue={stopRouteFilter}
            onFilterChange={setStopRouteFilter}
            filterLabel="Filter stops by route"
            onEdit={(stop) => {
              const route = state.routes.find((item) => item.id === stop.routeId);
              const original = route?.stops.find((item) => item.id === stop.id.split(":").slice(1).join(":"));
              if (!original) return;
              setForm({
                type: "stop",
                editing: { id: original.id, routeId: stop.routeId, stop: original },
              });
            }}
            onDelete={(stop) => {
              const originalId = stop.id.split(":").slice(1).join(":");
              setConfirm({
                type: "stop",
                id: originalId,
                routeId: stop.routeId,
                label: `stop ${stop.name}`,
              });
            }}
            rowLabel={(stop) => stop.name}
            emptyTitle="No stops found"
            emptyDescription="Change the route filter or add a stop."
          />
        </CardContent>
      </Card>
    );
  };

  const renderDrivers = () => {
    const rows = state.buses.filter((bus) => {
      if (driverFilter === "assigned") return Boolean(bus.driverId);
      if (driverFilter === "unassigned") return !bus.driverId;
      return true;
    });
    const columns: Column<Bus>[] = [
      { key: "bus", header: "Bus", cell: (bus) => <span className="font-bold">{bus.number}</span> },
      {
        key: "route",
        header: "Route",
        cell: (bus) => state.routes.find((route) => route.id === bus.routeId)?.name ?? "Unassigned",
      },
      {
        key: "driver",
        header: "Assigned driver",
        cell: (bus) =>
          state.drivers.find((driver) => driver.id === bus.driverId)?.name ?? "Unassigned",
      },
      {
        key: "contact",
        header: "Placeholder email",
        cell: (bus) =>
          state.drivers.find((driver) => driver.id === bus.driverId)?.email ?? "—",
      },
      {
        key: "status",
        header: "Assignment",
        cell: (bus) =>
          bus.driverId ? (
            <Badge tone="green" dot>Assigned</Badge>
          ) : (
            <Badge tone="amber" dot>Unassigned</Badge>
          ),
      },
    ];
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Driver assignments</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Only administrators can assign a driver to a bus.
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder="Search bus, route or driver"
            searchValue={(bus, query) =>
              [
                bus.number,
                state.routes.find((route) => route.id === bus.routeId)?.name ?? "",
                state.drivers.find((driver) => driver.id === bus.driverId)?.name ?? "",
                state.drivers.find((driver) => driver.id === bus.driverId)?.email ?? "",
              ]
                .join(" ")
                .toLowerCase()
                .includes(query)
            }
            filterOptions={[
              { value: "all", label: "All assignments" },
              { value: "assigned", label: "Assigned" },
              { value: "unassigned", label: "Unassigned" },
            ]}
            filterValue={driverFilter}
            onFilterChange={setDriverFilter}
            filterLabel="Filter assignments"
            onEdit={(bus) => setForm({ type: "assignment", bus })}
            rowLabel={(bus) => bus.number}
            emptyTitle="No assignments found"
            emptyDescription="Change the filter or add a bus first."
          />
        </CardContent>
      </Card>
    );
  };

  const renderTrips = () => {
    const rows = tripRows.filter((trip) => {
      if (tripFilter === "all") return true;
      if (tripFilter === "active") return trip.status === "active";
      if (tripFilter === "completed") return trip.status === "completed";
      return trip.status !== "active" && trip.status !== "completed";
    });
    const columns: Column<TripRow>[] = [
      { key: "bus", header: "Bus", cell: (trip) => <span className="font-bold">{trip.bus}</span> },
      { key: "route", header: "Route", cell: (trip) => trip.route },
      { key: "status", header: "Trip status", cell: (trip) => badgeForStatus(trip.status) },
      {
        key: "started",
        header: "Started",
        cell: (trip) => `${formatDateTime(trip.startedAt)} IST`,
      },
      {
        key: "sharing",
        header: "Sharing",
        cell: (trip) => (
          <Badge tone={trip.sharing ? "blue" : "neutral"}>
            {trip.sharing ? "On" : "Off"}
          </Badge>
        ),
      },
      {
        key: "last",
        header: "Last update",
        cell: (trip) => formatRelativeTime(trip.lastUpdate, state.currentTime),
      },
      {
        key: "progress",
        header: "Progress",
        cell: (trip) => (
          <div className="min-w-24">
            <ProgressBar value={trip.progress} className="bg-slate-100" />
            <span className="mt-1 block text-[10px] text-slate-400">{Math.round(trip.progress)}%</span>
          </div>
        ),
      },
      { key: "source", header: "Source", cell: (trip) => trip.source },
    ];
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Trip status</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              {isBackendAdmin && backendTripRows.length > 0
                ? "Rows are loaded from the Supabase trips table through the authorized API."
                : "Rows reflect local simulation trips. Ending a trip also stops simulated sharing."}
            </p>
          </div>
          <SimulatedTag label={isBackendAdmin ? "API read" : "Demo trips"} />
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder="Search trip by bus, route or status"
            searchValue={(trip, query) =>
              [trip.bus, trip.route, trip.status, trip.source]
                .join(" ")
                .toLowerCase()
                .includes(query)
            }
            filterOptions={[
              { value: "all", label: "All trips" },
              { value: "active", label: "Active" },
              { value: "completed", label: "Completed" },
              { value: "other", label: "Idle / Offline" },
            ]}
            filterValue={tripFilter}
            onFilterChange={setTripFilter}
            filterLabel="Filter trip status"
            extraActions={(trip) =>
              trip.status === "active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() =>
                    void runAction(
                      () => endTripAsAdmin(trip.routeId),
                      `Trip for ${trip.bus} was ended.`,
                    )
                  }
                >
                  End trip
                </Button>
              ) : null
            }
            rowLabel={(trip) => trip.bus}
            emptyTitle="No trips found"
            emptyDescription="Start a trip from the driver dashboard or change the filter."
          />
        </CardContent>
      </Card>
    );
  };

  const renderDelays = () => {
    const rows = state.delayReports.filter((report) => {
      if (delayFilter === "all") return true;
      if (delayFilter === "simulated") return report.simulated;
      return !report.simulated;
    });
    type DelayRow = (typeof rows)[number];
    const columns: Column<DelayRow>[] = [
      {
        key: "bus",
        header: "Bus",
        cell: (report) =>
          state.buses.find((bus) => bus.id === report.busId)?.number ?? report.busId,
      },
      {
        key: "route",
        header: "Route",
        cell: (report) =>
          state.routes.find((route) => route.id === report.routeId)?.code ?? report.routeId,
      },
      {
        key: "delay",
        header: "Delay",
        cell: (report) => (
          <Badge tone="amber">
            <Timer className="h-3 w-3" /> {Math.round(report.delaySeconds / 60)} min
          </Badge>
        ),
      },
      { key: "reason", header: "Reason", cell: (report) => report.reason },
      {
        key: "created",
        header: "Reported",
        cell: (report) => formatDateTime(report.createdAt),
      },
      {
        key: "source",
        header: "Source",
        cell: (report) =>
          report.simulated ? <SimulatedTag label="Simulated" /> : <Badge tone="green">Backend</Badge>,
      },
    ];
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Delay reports</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Manual and automatic simulated congestion events.</p>
          </div>
          <Button onClick={() => setForm({ type: "delay" })}>
            <Plus className="h-4 w-4" /> Report delay
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder="Search delay reason, route or bus"
            searchValue={(report, query) =>
              [report.reason, report.routeId, report.busId, String(report.delaySeconds)]
                .join(" ")
                .toLowerCase()
                .includes(query)
            }
            filterOptions={[
              { value: "all", label: "All sources" },
              { value: "simulated", label: "Simulated" },
              { value: "backend", label: "Backend" },
            ]}
            filterValue={delayFilter}
            onFilterChange={setDelayFilter}
            filterLabel="Filter delay source"
            onDelete={(report) =>
              setConfirm({
                type: "delay",
                id: report.id,
                label: `delay report (${Math.round(report.delaySeconds / 60)} min)`,
              })
            }
            rowLabel={(report) => report.reason}
            emptyTitle="No delay reports"
            emptyDescription="Use Report delay or the test-delay control to generate a sample report."
          />
        </CardContent>
      </Card>
    );
  };

  const renderHealth = () => {
    const rows = healthRows.filter(
      (row) => healthFilter === "all" || row.condition.toLowerCase() === healthFilter,
    );
    const columns: Column<HealthRow>[] = [
      { key: "bus", header: "Bus", cell: (row) => <span className="font-bold">{row.bus}</span> },
      { key: "route", header: "Route", cell: (row) => row.route },
      {
        key: "condition",
        header: "Location health",
        cell: (row) => (
          <Badge
            tone={row.condition === "Fresh" ? "green" : row.condition === "Stale" ? "amber" : "neutral"}
            dot
          >
            {row.condition}
          </Badge>
        ),
      },
      { key: "source", header: "Source", cell: (row) => row.source },
      {
        key: "lastUpdate",
        header: "Last update",
        cell: (row) => formatRelativeTime(row.lastUpdate, state.currentTime),
      },
      {
        key: "sharing",
        header: "Sharing",
        cell: (row) => (row.sharing ? "On during trip" : "Stopped"),
      },
      {
        key: "progress",
        header: "Progress",
        cell: (row) => (
          <div className="min-w-24">
            <ProgressBar value={row.progress} className="bg-slate-100" />
            <span className="mt-1 block text-[10px] text-slate-400">{Math.round(row.progress)}%</span>
          </div>
        ),
      },
    ];
    return (
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Location-update health</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Freshness is evaluated every second using a {config.staleLocationSeconds}-second threshold.
            </p>
          </div>
          <Button variant="outline" onClick={() => setTab("trips")}>
            <Activity className="h-4 w-4" /> View trips
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Fresh", value: healthRows.filter((row) => row.condition === "Fresh").length, tone: "bg-emerald-50 text-emerald-700" },
              { label: "Stale", value: healthRows.filter((row) => row.condition === "Stale").length, tone: "bg-amber-50 text-amber-700" },
              { label: "Offline", value: healthRows.filter((row) => row.condition === "Offline").length, tone: "bg-slate-100 text-slate-600" },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-4 ${item.tone}`}>
                <p className="text-xs font-semibold">{item.label} updates</p>
                <p className="mt-1 text-2xl font-extrabold">{item.value}</p>
              </div>
            ))}
          </div>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder="Search bus, route or source"
            searchValue={(row, query) =>
              [row.bus, row.route, row.source, row.condition, row.status]
                .join(" ")
                .toLowerCase()
                .includes(query)
            }
            filterOptions={[
              { value: "all", label: "All health states" },
              { value: "fresh", label: "Fresh" },
              { value: "stale", label: "Stale" },
              { value: "offline", label: "Offline" },
            ]}
            filterValue={healthFilter}
            onFilterChange={setHealthFilter}
            filterLabel="Filter location health"
            rowLabel={(row) => row.bus}
            emptyTitle="No location health rows"
            emptyDescription="Assign at least one bus to a route to monitor update freshness."
          />
          <Alert tone="info">
            <span className="inline-flex items-start gap-2">
              <Gauge className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                In real GPS mode, invalid, stale, off-route and unauthorized updates are rejected by the server. The
                last accepted position remains visible with a stale warning.
              </span>
            </span>
          </Alert>
        </CardContent>
      </Card>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case "buses":
        return renderBuses();
      case "routes":
        return renderRoutes();
      case "stops":
        return renderStops();
      case "drivers":
        return renderDrivers();
      case "trips":
        return renderTrips();
      case "delays":
        return renderDelays();
      case "health":
        return renderHealth();
      default:
        return renderOverview();
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    await runAction(async () => {
      if (confirm.type === "bus") await deleteBus(confirm.id);
      if (confirm.type === "route") await deleteRoute(confirm.id);
      if (confirm.type === "stop" && confirm.routeId) {
        await deleteStop(confirm.routeId, confirm.id);
      }
      if (confirm.type === "delay") await deleteDelayReport(confirm.id);
    }, `${confirm.label} was deleted.`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Transport operations"
        description="Manage the catalog, assignments, trip state, delay reports and location-update health from one workspace."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isBackendAdmin ? (
              <Badge tone="green" dot>Supabase admin</Badge>
            ) : (
              <DemoModeBadge />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runAction(refreshBackendData, "Data refreshed.")}
              disabled={!isBackendAdmin}
              loading={actionLoading}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Alert tone="error" title="Operation failed" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert tone="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {!isBackendAdmin && (
        <Alert tone="info">
          <div className="flex flex-wrap items-center gap-2">
            <SimulatedTag label="Local demo mode" />
            <span>
              Add, edit and delete operations are stored in this browser. Configure Supabase credentials, apply the
              migration, and sign in as an admin to use server-authorized database operations.
            </span>
          </div>
        </Alert>
      )}

      <Tabs items={tabs} value={tab} onChange={setTab} />
      {renderTab()}

      <BusFormDialog
        open={form?.type === "bus"}
        onClose={() => setForm(null)}
        routes={state.routes}
        drivers={state.drivers}
        editing={form?.type === "bus" ? form.editing : null}
        onSubmit={(values, id) =>
          runAction(() => saveBus(values, id), id ? "Bus updated." : "Bus added.")
        }
      />
      <RouteFormDialog
        open={form?.type === "route"}
        onClose={() => setForm(null)}
        routes={state.routes}
        editing={form?.type === "route" ? form.editing : null}
        onSubmit={(values, id) =>
          runAction(() => saveRoute(values, id), id ? "Route updated." : "Route added.")
        }
      />
      <StopFormDialog
        open={form?.type === "stop"}
        onClose={() => setForm(null)}
        routes={state.routes}
        defaultRouteId={stopRouteFilter === "all" ? state.selectedRouteId : stopRouteFilter}
        editing={form?.type === "stop" ? form.editing : null}
        onSubmit={(routeId, values, id) =>
          runAction(() => saveStop(routeId, values, id), id ? "Stop updated." : "Stop added.")
        }
      />
      <DriverAssignmentDialog
        open={form?.type === "assignment"}
        onClose={() => setForm(null)}
        bus={form?.type === "assignment" ? form.bus : null}
        route={state.routes.find(
          (route) => form?.type === "assignment" && route.id === form.bus.routeId,
        )}
        drivers={state.drivers}
        onSubmit={(busId, driverId) =>
          runAction(() => assignDriver(busId, driverId), "Driver assignment updated.")
        }
      />
      <DelayReportDialog
        open={form?.type === "delay"}
        onClose={() => setForm(null)}
        routes={state.routes}
        buses={state.buses}
        onSubmit={(values) =>
          runAction(() => reportDelay(values), "Delay report and alert created.")
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => void handleConfirm()}
        title="Confirm deletion"
        description={`Are you sure you want to delete ${confirm?.label ?? "this item"}? This operation uses a confirmation step and validates authorization.`}
        confirmLabel="Delete"
        loading={actionLoading}
      />
    </div>
  );
}
