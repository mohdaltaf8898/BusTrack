"use client";

import { ChevronDown } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatusCard } from "@/components/dashboard/status-card";
import { UpcomingStops } from "@/components/dashboard/upcoming-stops";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SimulationControls } from "@/components/dashboard/simulation-controls";
import { LiveMap } from "@/components/maps/live-map";
import { RouteAccuracyNote } from "@/components/maps/route-accuracy-note";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";

export default function DashboardPage() {
  const { state, snapshot, selectStop } = useApp();

  if (state.routes.length === 0) {
    return <EmptyState title="No routes available" description="Add a route in the admin dashboard to begin tracking a simulated bus." />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader />
      <StatusCard />
      {snapshot.isStale && (
        <Alert tone="warning" title="Location data is stale">
          No fresh update for {snapshot.route.busNumber}. The map shows the last known position; the ETA is a frozen estimate.
        </Alert>
      )}
      {!state.isOnline && (
        <Alert tone="info" title="You are offline">
          BusTrack is using cached demo data. Simulated movement and notifications continue locally.
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(310px,0.8fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Route map</CardTitle>
            <p className="mt-1 text-xs text-slate-600">Position and route are simulated unless device GPS is explicitly labeled.</p>
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
              className="h-[300px] md:h-[400px]"
            />
            <RouteAccuracyNote route={snapshot.route} />
          </CardContent>
        </Card>
        <UpcomingStops />
      </div>
      <QuickActions />
      <details className="group rounded-2xl border border-slate-200 bg-white">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-semibold text-navy-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 [&::-webkit-details-marker]:hidden">
          <span>Demo controls <span className="ml-2 font-normal text-slate-600">Manage the local simulation</span></span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-slate-100 p-3 sm:p-4">
          <SimulationControls compact className="border-0 shadow-none" />
        </div>
      </details>
    </div>
  );
}
