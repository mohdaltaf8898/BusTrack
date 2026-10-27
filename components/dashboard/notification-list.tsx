"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  BusFront,
  Check,
  CheckCheck,
  Clock3,
  FlaskConical,
  Inbox,
  MapPin,
  Megaphone,
  ShieldAlert,
  TriangleAlert,
  Trash2,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { SimulatedTag } from "@/components/ui/labels";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationType } from "@/lib/types";

type Filter = "all" | "unread" | "delay" | "arrival" | "system";

const notificationMeta: Record<
  NotificationType,
  { label: string; tone: "blue" | "amber" | "rose" | "green" | "violet" | "neutral"; Icon: typeof BellRing }
> = {
  delay: { label: "Delay", tone: "amber", Icon: TriangleAlert },
  approaching: { label: "Approaching", tone: "violet", Icon: MapPin },
  arrival: { label: "Arrival", tone: "blue", Icon: BusFront },
  trip_started: { label: "Trip started", tone: "green", Icon: Megaphone },
  trip_completed: { label: "Trip completed", tone: "green", Icon: Check },
  location_unavailable: { label: "Location", tone: "rose", Icon: WifiOff },
  system: { label: "System", tone: "neutral", Icon: ShieldAlert },
};

function matchesFilter(item: NotificationItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "unread") return !item.readAt;
  if (filter === "delay") return item.type === "delay";
  if (filter === "arrival") return item.type === "arrival" || item.type === "approaching";
  return (
    item.type === "system" ||
    item.type === "trip_started" ||
    item.type === "trip_completed" ||
    item.type === "location_unavailable"
  );
}

export function NotificationList() {
  const {
    state,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    clearNotifications,
    injectDelay,
    pushPermission,
    requestPushPermission,
  } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const filtered = useMemo(
    () => state.notifications.filter((item) => matchesFilter(item, filter)),
    [state.notifications, filter],
  );

  const tabs: TabItem<Filter>[] = [
    { id: "all", label: "All", count: state.notifications.length },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "delay", label: "Delays" },
    { id: "arrival", label: "Arrivals" },
    { id: "system", label: "System" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Notification center</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Duplicate alerts are suppressed by stable simulation event keys.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              injectDelay(state.selectedRouteId);
              setNotice("A simulated 5-minute delay and alert were added to the selected route.");
            }}
          >
            <FlaskConical className="h-4 w-4" /> Test delay
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600"
            onClick={() => setConfirmClear(true)}
            disabled={state.notifications.length === 0}
          >
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs items={tabs} value={filter} onChange={setFilter} />

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <div className="text-xs leading-5 text-amber-900">
                <p className="font-bold">Browser alerts are optional</p>
                <p>
                  {pushPermission === "granted"
                    ? "Browser notifications are enabled while this tab is open."
                    : pushPermission === "denied"
                      ? "Permission was blocked in your browser settings."
                      : pushPermission === "unsupported"
                        ? "This browser does not support the Notification API."
                        : "Grant permission to preview browser notifications. No SMS or WhatsApp provider is configured."}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pushPermission === "granted" || pushPermission === "unsupported"}
              onClick={async () => {
                try {
                  setPushError(null);
                  await requestPushPermission();
                } catch (error) {
                  setPushError(error instanceof Error ? error.message : "Permission request failed.");
                }
              }}
            >
              {pushPermission === "granted" ? "Enabled" : "Enable browser alerts"}
            </Button>
          </div>
          {pushError && (
            <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">
              {pushError}
            </p>
          )}
        </div>

        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title={filter === "unread" ? "You’re all caught up" : "No notifications here"}
            description={
              filter === "unread"
                ? "New simulated bus alerts will appear here as the trip progresses."
                : "Try another filter or use the test-delay button to generate a sample alert."
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((item) => {
              const meta = notificationMeta[item.type];
              const Icon = meta.Icon;
              const unread = !item.readAt;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-2xl border p-3.5 transition",
                    unread
                      ? "border-brand-100 bg-brand-50/40"
                      : "border-slate-100 bg-white",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        unread ? "bg-white text-brand-600 shadow-sm" : "bg-slate-50 text-slate-500",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {unread && (
                          <span className="h-2 w-2 rounded-full bg-brand-500" aria-label="Unread" />
                        )}
                        {item.simulated && <SimulatedTag label="Simulated" />}
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-navy-950">{item.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{item.message}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          {formatRelativeTime(item.createdAt, state.currentTime)}
                        </span>
                        <span>·</span>
                        <span>{formatDateTime(item.createdAt)} IST</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {unread && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          aria-label={`Mark ${item.title} as read`}
                          title="Mark as read"
                          onClick={() => markRead(item.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-rose-600"
                        aria-label={`Delete ${item.title}`}
                        title="Delete"
                        onClick={() => deleteNotification(item.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearNotifications();
          setConfirmClear(false);
        }}
        title="Clear all notifications?"
        description="This removes local demo notifications from this browser. New simulated alerts can still be generated."
        confirmLabel="Clear all"
      />
    </Card>
  );
}
