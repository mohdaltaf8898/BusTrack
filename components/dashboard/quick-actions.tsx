"use client";

import { useState } from "react";
import {
  Bell,
  BusFront,
  Check,
  MapPin,
  Navigation,
  Route as RouteIcon,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulatedTag } from "@/components/ui/labels";
import { cn } from "@/lib/utils";

const actionStyles =
  "group flex min-h-[92px] flex-col items-start justify-between rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

export function QuickActions() {
  const { snapshot, unreadCount, selectStop } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Quick actions</CardTitle>
          <SimulatedTag label="Demo" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <ButtonLink
            href="/track"
            className={cn(
              actionStyles,
              "col-span-2 border-navy-950 bg-navy-950 text-white hover:bg-navy-800 sm:col-span-1",
            )}
          >
            <span className="flex items-center justify-between w-full">
              <Navigation className="h-5 w-5 text-brand-300" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-white/45">Live</span>
            </span>
            <span>
              <span className="block text-sm font-extrabold">Track Bus</span>
              <span className="mt-0.5 block text-[11px] text-white/60">Open full map</span>
            </span>
          </ButtonLink>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(actionStyles, "border-slate-200 bg-white text-navy-950")}
          >
            <MapPin className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <span>
              <span className="block text-sm font-extrabold">Select Stop</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">Change ETA stop</span>
            </span>
          </button>

          <ButtonLink
            href="/routes"
            className={cn(actionStyles, "border-slate-200 bg-white text-navy-950")}
          >
            <RouteIcon className="h-5 w-5 text-violet-600" aria-hidden="true" />
            <span>
              <span className="block text-sm font-extrabold">View Route</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">Stops & schedule</span>
            </span>
          </ButtonLink>

          <ButtonLink
            href="/notifications"
            className={cn(actionStyles, "border-slate-200 bg-white text-navy-950")}
          >
            <span className="flex w-full items-center justify-between">
              <Bell className="h-5 w-5 text-amber-600" aria-hidden="true" />
              {unreadCount > 0 && <Badge tone="rose">{unreadCount} new</Badge>}
            </span>
            <span>
              <span className="block text-sm font-extrabold">Notifications</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">Delays & arrivals</span>
            </span>
          </ButtonLink>

          <ButtonLink
            href="/bus-details"
            className={cn(actionStyles, "border-slate-200 bg-white text-navy-950")}
          >
            <BusFront className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <span>
              <span className="block text-sm font-extrabold">Bus Details</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">Vehicle & contacts</span>
            </span>
          </ButtonLink>
        </div>
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Select your stop"
        description="Choose a stop to personalize the ETA shown on the dashboard and live map."
        footer={
          <Button onClick={() => setOpen(false)}>Done</Button>
        }
      >
        <div className="space-y-1.5">
          {snapshot.route.stops.map((stop) => {
            const selected = stop.id === snapshot.selectedStop.id;
            return (
              <button
                key={stop.id}
                type="button"
                onClick={() => {
                  selectStop(stop.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                  selected
                    ? "border-brand-200 bg-brand-50"
                    : "border-slate-100 hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold",
                    selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {stop.order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-navy-950">{stop.name}</span>
                  <span className="block text-[11px] text-slate-500">
                    {stop.landmark ?? "Route stop"}
                  </span>
                </span>
                {selected && <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </Dialog>
    </Card>
  );
}
