"use client";

import { useApp } from "@/state/app-provider";
import { CountUp } from "@/components/motion/count-up";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { PageHeader } from "@/components/page-header";
import { NotificationList } from "@/components/dashboard/notification-list";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { SimulatedTag } from "@/components/ui/labels";

export default function NotificationsPage() {
  const { state, unreadCount, snapshot } = useApp();
  return (
    <RevealGroup trigger="mount" stagger={0.07} className="space-y-5">
      <RevealItem variant="small">
        <PageHeader
          eyebrow="Alerts"
          title="Route alerts"
          description="Delay, approach, arrival and location alerts from the local simulation. No SMS or WhatsApp delivery is configured."
        />
      </RevealItem>

      <RevealItem className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4 sm:p-5">
          <p className="text-xs text-slate-600">Unread alerts</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-navy-950">
            <CountUp value={unreadCount} duration={0.6} />
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-4 sm:p-5">
          <p className="text-xs text-slate-600">Saved in browser</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-navy-950">
            <CountUp value={state.notifications.length} duration={0.6} />
          </p>
        </CardContent></Card>
        <Card className="col-span-2 sm:col-span-1"><CardContent className="p-4 sm:p-5">
          <p className="text-xs text-slate-600">Selected route</p>
          <p className="mt-1 truncate text-lg font-semibold text-navy-950">
            {snapshot.route.code} · {snapshot.route.busNumber}
          </p>
        </CardContent></Card>
      </RevealItem>

      <RevealItem variant="small">
        <Alert tone="info">
          <div className="flex flex-wrap items-center gap-2">
            <SimulatedTag label="Simulated alerts" />
            <span>
              {state.notifications.length} local alerts are stored in this browser. Browser notifications are optional;
              SMS and WhatsApp delivery are not configured.
            </span>
          </div>
        </Alert>
      </RevealItem>

      <RevealItem>
        <NotificationList />
      </RevealItem>
    </RevealGroup>
  );
}
