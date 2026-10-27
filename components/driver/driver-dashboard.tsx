"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BusFront,
  CirclePause,
  CirclePlay,
  Compass,
  KeyRound,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { PageHeader } from "@/components/page-header";
import { SimulationControls } from "@/components/dashboard/simulation-controls";
import { LiveMap } from "@/components/maps/live-map";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Label, Select } from "@/components/ui/form";
import { DemoModeBadge, SimulatedTag, SourceLabel } from "@/components/ui/labels";
import { Switch } from "@/components/ui/switch";
import { formatCoordinates, formatDateTime, formatRelativeTime } from "@/lib/format";
import { bearingToCompass } from "@/lib/geo";
import type { LocationInput } from "@/lib/validation-types";

type RealTripStatus = "idle" | "starting" | "active" | "ended" | "error";

function getTripId(result: Record<string, unknown>): string | null {
  if (typeof result.tripId === "string") return result.tripId;
  const trip = result.trip;
  if (trip && typeof trip === "object" && "id" in trip && typeof trip.id === "string") {
    return trip.id;
  }
  return null;
}

export function DriverDashboard() {
  const {
    state,
    config,
    getRouteSnapshot,
    startTrip,
    endTrip,
    setSharing,
    togglePause,
    reset,
    callTripApi,
    submitLocation,
    selectStop,
  } = useApp();
  const assignedBus =
    state.buses.find((bus) => bus.id === state.user?.assignedBusId) ??
    state.buses.find((bus) => bus.driverId === state.user?.id) ??
    state.buses[0];
  const assignedRouteId = assignedBus?.routeId ?? state.selectedRouteId;
  const [demoRouteId, setDemoRouteId] = useState(assignedRouteId);
  const [realTripId, setRealTripId] = useState<string | null>(null);
  const [realTripStatus, setRealTripStatus] = useState<RealTripStatus>("idle");
  const [realSharing, setRealSharing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState("not requested");
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const isRealMode = config.publicConfigured && state.user?.provider === "supabase";
  const routeId = isRealMode ? assignedRouteId : demoRouteId;
  const routeSnapshot = getRouteSnapshot(routeId);
  const simulation = routeSnapshot.simulation;
  const isTripActive = isRealMode
    ? realTripStatus === "active" && Boolean(realTripId)
    : simulation.tripStatus === "active";
  const sharing = isRealMode ? realSharing : simulation.isSharing;
  const canEndDemoTrip =
    simulation.tripStatus === "active" || simulation.tripStatus === "offline";

  useEffect(() => {
    setDemoRouteId(assignedRouteId);
  }, [assignedRouteId]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => stopWatch, [stopWatch]);

  const sendPosition = useCallback(
    async (position: GeolocationPosition) => {
      if (!assignedBus || !realTripId) return;
      const now = Date.now();
      // Browser GPS can emit more often than needed; throttle to one update / 4 s.
      if (now - lastSentRef.current < 4000) return;
      lastSentRef.current = now;
      const coords = position.coords;
      const payload: LocationInput = {
        busId: assignedBus.id,
        tripId: realTripId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading:
          typeof coords.heading === "number" && Number.isFinite(coords.heading)
            ? coords.heading
            : null,
        speedKmh:
          typeof coords.speed === "number" && Number.isFinite(coords.speed)
            ? Math.max(0, coords.speed * 3.6)
            : null,
        accuracyMeters:
          typeof coords.accuracy === "number" && Number.isFinite(coords.accuracy)
            ? coords.accuracy
            : null,
        recordedAt: new Date(position.timestamp).toISOString(),
      };
      try {
        await submitLocation(payload);
        setLastSentAt(now);
        setLocalError(null);
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : "Location update was rejected.");
      }
    },
    [assignedBus, realTripId, submitLocation],
  );

  const startRealTrip = async () => {
    if (!assignedBus) return;
    setActionLoading(true);
    setLocalError(null);
    setLocalNotice(null);
    try {
      const result = await callTripApi({
        action: "start",
        busId: assignedBus.id,
        routeId,
      });
      const tripId = getTripId(result);
      if (!tripId) throw new Error("The server did not return an active trip ID.");
      setRealTripId(tripId);
      setRealTripStatus("active");
      setRealSharing(false);
      setLocalNotice("Server-authorized trip started. Turn on Share Location to request device GPS permission.");
    } catch (error) {
      setRealTripStatus("error");
      setLocalError(error instanceof Error ? error.message : "Could not start a trip.");
    } finally {
      setActionLoading(false);
    }
  };

  const endRealTrip = async () => {
    setActionLoading(true);
    setLocalError(null);
    try {
      stopWatch();
      if (realTripId) {
        await callTripApi({ action: "end", tripId: realTripId });
      }
      setRealSharing(false);
      setRealTripId(null);
      setRealTripStatus("ended");
      setPermissionState("not requested");
      setLocalNotice("Trip ended. Browser location sharing stopped and will not be stored while off duty.");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Could not end the trip.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRealSharing = async (enabled: boolean) => {
    if (!realTripId) {
      setLocalError("Start an authorized trip before sharing your location.");
      return;
    }
    if (!enabled) {
      stopWatch();
      setRealSharing(false);
      setPermissionState("paused");
      try {
        await callTripApi({ action: "share", tripId: realTripId, enabled: false });
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : "Could not stop sharing.");
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocalError("This browser does not expose the Geolocation API. Use HTTPS and a supported device.");
      return;
    }
    setActionLoading(true);
    setLocalError(null);
    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        setPermissionState(permission.state);
        if (permission.state === "denied") {
          throw new Error("Location permission is blocked. Enable it in browser settings and try again.");
        }
      } else {
        setPermissionState("browser prompt");
      }
      await callTripApi({ action: "share", tripId: realTripId, enabled: true });
      const watchId = navigator.geolocation.watchPosition(
        (position) => void sendPosition(position),
        (error) => {
          setLocalError(`Location error: ${error.message}`);
          if (error.code === error.PERMISSION_DENIED) {
            stopWatch();
            setRealSharing(false);
            setPermissionState("denied");
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 4000,
          timeout: 12000,
        },
      );
      watchIdRef.current = watchId;
      setRealSharing(true);
      setLocalNotice("Location sharing is active. Coordinates are sent only while this trip is active.");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Could not start location sharing.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!assignedBus) {
    return (
      <EmptyState
        icon={<BusFront className="h-6 w-6" />}
        title="No bus assigned"
        description="Ask an administrator to assign a bus to your driver profile before starting a trip."
        action={<ButtonLink href="/admin">Open admin dashboard</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Driver workspace"
        title={`Welcome, ${state.user?.name.split(" ")[0] ?? "driver"}`}
        description="This is the driver-side device screen. Opening a student dashboard never accesses your location."
        actions={
          isRealMode ? (
            <Badge tone="green" dot>
              Supabase Auth
            </Badge>
          ) : (
            <DemoModeBadge />
          )
        }
      />

      {!isRealMode && (
        <Alert tone="info">
          <div className="flex flex-wrap items-center gap-2">
            <SimulatedTag label="Simulation mode" />
            <span>
              Start Trip moves a generated bus along the route. No browser GPS permission is requested in this mode.
            </span>
          </div>
        </Alert>
      )}

      {isRealMode && (
        <Alert tone="warning" title="Real GPS mode is configuration-dependent">
          This path uses Supabase Auth, a server-side service role, an assigned driver profile, Realtime, and browser
          location permission. Live GPS has not been tested in this environment. If configuration is missing, the API
          returns a safe error and no location is stored.
        </Alert>
      )}

      {localError && (
        <Alert tone="error" title="Driver action failed" onDismiss={() => setLocalError(null)}>
          {localError}
        </Alert>
      )}
      {localNotice && (
        <Alert tone="success" onDismiss={() => setLocalNotice(null)}>
          {localNotice}
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <BusFront className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Assigned bus</p>
              <p className="truncate text-base font-extrabold text-navy-950">{assignedBus.number}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Navigation className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Assigned route</p>
              <p className="truncate text-base font-extrabold text-navy-950">
                {routeSnapshot.route.code} · {routeSnapshot.route.name}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Signal className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Connection status</p>
              <p className="truncate text-base font-extrabold text-navy-950">
                {state.isOnline ? (state.realtimeStatus === "connected" ? "Realtime connected" : "Online") : "Offline"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Radio className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Last update</p>
              <p className="truncate text-base font-extrabold text-navy-950">
                {formatRelativeTime(
                  isRealMode && lastSentAt ? lastSentAt : routeSnapshot.lastUpdateAt,
                  state.currentTime,
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Current location</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                {isRealMode
                  ? "Device coordinates appear only after an authorized trip and permission."
                  : "Generated position is constrained to the selected route."}
              </p>
            </div>
            <SourceLabel mode={routeSnapshot.dataMode} />
          </CardHeader>
          <CardContent className="space-y-3">
            <LiveMap
              route={routeSnapshot.route}
              geometry={routeSnapshot.geometry}
              busPosition={routeSnapshot.busPosition}
              progressDistanceMeters={routeSnapshot.effectiveDistanceMeters}
              busStatus={routeSnapshot.busStatus}
              selectedStopId={routeSnapshot.selectedStop.id}
              isStale={routeSnapshot.isStale}
              isLiveData={routeSnapshot.isLiveData}
              onSelectStop={selectStop}
              className="h-[340px] md:h-[430px]"
            />
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Coordinates</p>
                <p className="mt-1 font-mono text-xs font-bold text-navy-950">
                  {formatCoordinates(routeSnapshot.busPosition.lat, routeSnapshot.busPosition.lng)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Direction</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-navy-950">
                  <Compass className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                  {bearingToCompass(routeSnapshot.busPosition.bearing)} · {Math.round(routeSnapshot.busPosition.bearing)}°
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Reported at</p>
                <p className="mt-1 text-xs font-bold text-navy-950">
                  {formatDateTime(isRealMode && lastSentAt ? lastSentAt : routeSnapshot.lastUpdateAt)} IST
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Trip controls</CardTitle>
                <Badge tone={isTripActive ? "green" : "neutral"} dot>
                  {isRealMode ? realTripStatus : simulation.tripStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isRealMode && (
                <div>
                  <Label htmlFor="demo-route">Demo route assignment</Label>
                  <Select
                    id="demo-route"
                    value={demoRouteId}
                    onChange={(event) => setDemoRouteId(event.target.value)}
                  >
                    {state.routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.code} · {route.name} ({route.busNumber})
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Demo-only selector. A real driver receives one assigned bus and route from Supabase.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-navy-950">
                    <LocateFixed className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    Share Location
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isRealMode
                      ? `Requires active trip · permission: ${permissionState}`
                      : "Publishes generated coordinates to student views."}
                  </p>
                </div>
                <Switch
                  checked={sharing}
                  onCheckedChange={(checked) => {
                    if (isRealMode) void toggleRealSharing(checked);
                    else setSharing(routeId, checked);
                  }}
                  disabled={!isTripActive || actionLoading}
                  aria-label="Toggle location sharing"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => (isRealMode ? void startRealTrip() : startTrip(routeId))}
                  disabled={isRealMode ? actionLoading || isTripActive : simulation.tripStatus === "active"}
                >
                  <CirclePlay className="h-4 w-4" /> Start Trip
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => (isRealMode ? void endRealTrip() : endTrip(routeId))}
                  disabled={isRealMode ? actionLoading || !isTripActive : !canEndDemoTrip}
                >
                  End Trip
                </Button>
              </div>

              {!isRealMode && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => togglePause(routeId)}
                    disabled={!isTripActive}
                  >
                    {simulation.isRunning ? (
                      <>
                        <CirclePause className="h-4 w-4" /> Pause
                      </>
                    ) : (
                      <>
                        <CirclePlay className="h-4 w-4" /> Resume
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => reset(routeId)}>
                    <RefreshCw className="h-4 w-4" /> Reset
                  </Button>
                </div>
              )}

              <div className="space-y-2 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span className="font-bold text-navy-900">Authorization</span>
                  <span className="ml-auto">{state.user?.role}</span>
                </p>
                <p className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  <span className="font-bold text-navy-900">Provider</span>
                  <span className="ml-auto">{state.user?.provider}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-violet-600" aria-hidden="true" />
                  <span className="font-bold text-navy-900">GPS source</span>
                  <span className="ml-auto">{isRealMode ? "Device (authorized)" : "Simulation"}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span className="font-bold text-navy-900">Realtime</span>
                  <span className="ml-auto">{state.realtimeStatus}</span>
                </p>
              </div>

              {isRealMode && (
                <Alert tone="info">
                  <span className="inline-flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Coordinates are accepted only for your assigned bus during an active trip with sharing enabled.
                      Invalid, stale or off-route updates are rejected by the server.
                    </span>
                  </span>
                </Alert>
              )}

              {!isRealMode && (
                <Alert tone="warning">
                  <span className="inline-flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      This simulation does not read your device location. No private driver position is exposed off duty.
                    </span>
                  </span>
                </Alert>
              )}

              {!state.isOnline && (
                <Alert tone="error">
                  <span className="inline-flex items-center gap-2">
                    <WifiOff className="h-4 w-4" aria-hidden="true" />
                    Browser offline. Real GPS submissions will fail until connectivity returns.
                  </span>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Driver checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2.5 text-sm text-slate-600">
                {[
                  "Confirm the assigned bus and route before starting.",
                  "Start Trip only when you begin the journey.",
                  "Enable Share Location and allow the browser permission prompt.",
                  "Keep this device screen available during the trip.",
                  "End Trip at the destination to stop all location sharing.",
                ].map((item, index) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-extrabold text-brand-700">
                      {index + 1}
                    </span>
                    <span className="leading-6">{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {!isRealMode && <SimulationControls routeId={routeId} />}
    </div>
  );
}
