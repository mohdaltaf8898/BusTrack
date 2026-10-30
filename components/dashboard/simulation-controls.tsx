"use client";

import { useState } from "react";
import {
  CirclePause,
  CirclePlay,
  Clock3,
  FlaskConical,
  LocateFixed,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { formatRelativeTime } from "@/lib/format";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulatedTag, SourceLabel } from "@/components/ui/labels";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function SimulationControls({
  routeId,
  compact = false,
  className,
}: {
  routeId?: string;
  compact?: boolean;
  className?: string;
}) {
  const {
    state,
    config,
    getRouteSnapshot,
    startTrip,
    endTrip,
    togglePause,
    reset,
    injectDelay,
    simulateOffline,
    resumeOffline,
    setSharing,
  } = useApp();
  const currentRouteId = routeId ?? state.selectedRouteId;
  const routeSnapshot = getRouteSnapshot(currentRouteId);
  const simulation = routeSnapshot.simulation;
  const [confirmReset, setConfirmReset] = useState(false);
  const isActive = simulation.tripStatus === "active";
  const isOffline = simulation.tripStatus === "offline";
  const canStart = simulation.tripStatus === "idle" || simulation.tripStatus === "completed";

  return (
    <Card className={className}>
      <CardHeader className={cn(compact && "p-4 pb-2")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <CardTitle>Simulation controls</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SimulatedTag label="Demo data" />
            <SourceLabel mode={routeSnapshot.dataMode} />
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Time is accelerated ×{config.simulationSpeedMultiplier}. Bus movement stays on the route polyline.
        </p>
      </CardHeader>
      <CardContent className={cn("space-y-4", compact && "p-4 pt-0")}>
        {routeSnapshot.isLiveData && (
          <Alert tone="info">
            Device GPS is active for this route. These controls only affect the local simulation fallback.
          </Alert>
        )}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Trip status</p>
            <p className="mt-1 text-sm font-extrabold capitalize text-navy-950">
              {simulation.tripStatus}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Last update</p>
            <p className="mt-1 text-sm font-extrabold text-navy-950">
              {formatRelativeTime(simulation.lastUpdateAt, state.currentTime)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sim traffic</p>
            <p className="mt-1 text-sm font-extrabold text-navy-950">
              {routeSnapshot.traffic.label}
              {simulation.delaySeconds > 0 && (
                <span className="ml-1.5 text-xs font-bold text-amber-600">
                  +{Math.round(simulation.delaySeconds / 60)} min
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3.5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-bold text-navy-950">
              <Radio className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Simulated location sharing
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {simulation.isSharing
                ? "Student views receive generated position updates."
                : "Sharing stopped. The last known position remains visible."}
            </p>
          </div>
          <Switch
            checked={simulation.isSharing}
            onCheckedChange={(checked) => setSharing(currentRouteId, checked)}
            disabled={!isActive && !simulation.isSharing}
            aria-label="Toggle simulated location sharing"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {canStart && (
            <Button onClick={() => startTrip(currentRouteId)}>
              <CirclePlay className="h-4 w-4" /> Start trip
            </Button>
          )}
          {isActive && (
            <Button onClick={() => togglePause(currentRouteId)} variant={simulation.isRunning ? "outline" : "primary"}>
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
          )}
          {isOffline && (
            <Button onClick={() => resumeOffline(currentRouteId)}>
              <LocateFixed className="h-4 w-4" /> Restore connection
            </Button>
          )}
          {(isActive || isOffline) && (
            <Button onClick={() => endTrip(currentRouteId)} variant="secondary">
              End trip
            </Button>
          )}
          <Button onClick={() => injectDelay(currentRouteId)} variant="outline">
            <Clock3 className="h-4 w-4" /> Add 5-min delay
          </Button>
          {!isOffline && isActive && (
            <Button onClick={() => simulateOffline(currentRouteId)} variant="outline">
              <WifiOff className="h-4 w-4" /> Simulate offline
            </Button>
          )}
          <Button
            onClick={() => setConfirmReset(true)}
            variant="ghost"
            className="text-slate-600"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <Badge tone="blue">
            <RouteIcon className="h-3 w-3" /> {routeSnapshot.route.code}
          </Badge>
          <span>Two congestion pockets automatically add small simulated delays during each trip.</span>
          {routeSnapshot.isStale && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Stale data warning active
            </span>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          reset(currentRouteId);
          setConfirmReset(false);
        }}
        title="Reset this simulation?"
        description="The bus returns to its starting stop, simulated delays are cleared, and location sharing stops. This does not delete routes or stops."
        confirmLabel="Reset simulation"
      />
    </Card>
  );
}
