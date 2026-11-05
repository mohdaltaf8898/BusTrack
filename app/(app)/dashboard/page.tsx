"use client";

import { useApp } from "@/state/app-provider";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatusCard } from "@/components/dashboard/status-card";
import { UpcomingStops } from "@/components/dashboard/upcoming-stops";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LiveMap } from "@/components/maps/live-map";
import { RouteAccuracyNote } from "@/components/maps/route-accuracy-note";
import { PullToRefresh, RefreshButton } from "@/components/motion/pull-to-refresh";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Collapsible, EmptyState } from "@/components/ui/feedback";

export default function DashboardPage() {
  const { state, snapshot, selectStop, refreshBackendData } = useApp();

  if (state.routes.length === 0) {
    return <EmptyState title="No routes available" description="Add a route in the admin dashboard to begin tracking a simulated bus." />;
  }

  return (
    <PullToRefresh onRefresh={refreshBackendData} disabled={!state.isOnline}>
      <RevealGroup trigger="mount" stagger={0.08} className="space-y-5 sm:space-y-6">
        <RevealItem variant="small">
          <DashboardHeader />
        </RevealItem>
        <RevealItem>
          <StatusCard />
        </RevealItem>
        <Collapsible show={snapshot.isStale}>
          <Alert tone="warning" title="Location data is stale">
            No fresh update for {snapshot.route.busNumber}. The map shows the last known position; the ETA is a frozen estimate.
          </Alert>
        </Collapsible>
        <Collapsible show={!state.isOnline}>
          <Alert tone="info" title="You are offline">
            BusTrack is showing the last data it received. Cached route and alert information stays available.
          </Alert>
        </Collapsible>
        <RevealItem className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(310px,0.8fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Route map</CardTitle>
                <p className="mt-1 text-xs text-slate-600">Position and route are simulated unless device GPS is explicitly labeled.</p>
              </div>
              <RefreshButton onRefresh={refreshBackendData} className="-mr-2 -mt-1 hidden sm:inline-flex" />
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
        </RevealItem>
        <RevealItem>
          <QuickActions />
        </RevealItem>
      </RevealGroup>
    </PullToRefresh>
  );
}
