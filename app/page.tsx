"use client";

import { ArrowUpRight, Layers3 } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatusCard } from "@/components/dashboard/status-card";
import { UpcomingStops } from "@/components/dashboard/upcoming-stops";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SimulationControls } from "@/components/dashboard/simulation-controls";
import { LiveMap } from "@/components/maps/live-map";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { SimulatedTag, SourceLabel } from "@/components/ui/labels";

export default function DashboardPage() {
  const { state, snapshot, selectStop } = useApp();

  if (state.routes.length === 0) {
    return (
      <EmptyState
        title="No routes available"
        description="Add a route in the admin dashboard to begin tracking a simulated bus."
      />
    );
  }

  return (
    <div className="space-y-5">
      <DashboardHeader />
      <StatusCard />

      {snapshot.isStale && (
        <Alert tone="warning" title="Location data is stale">
          No fresh update for {snapshot.route.busNumber}. The map is showing the last known position;
          the ETA below is a frozen estimate rather than a live prediction.
        </Alert>
      )}
      {!state.isOnline && (
        <Alert tone="info" title="You are offline">
          BusTrack is using cached demo data. Simulated movement and notifications continue locally.
        </Alert>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Live route map
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Bus marker and traveled route are synchronized every second.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <SimulatedTag label={snapshot.isLiveData ? "ETA estimate" : "Simulated"} />
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
              className="h-[330px] md:h-[420px]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] leading-5 text-slate-500">
                OpenStreetMap tiles · approximate Hyderabad coordinates · generated vehicle position.
                Tap a stop marker to change the selected ETA stop.
              </p>
              <ButtonLink href="/track" variant="soft" size="sm">
                Full tracking <ArrowUpRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </CardContent>
        </Card>

        <UpcomingStops />
      </div>

      <QuickActions />
      <SimulationControls compact />
    </div>
  );
}
