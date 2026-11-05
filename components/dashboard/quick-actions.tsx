"use client";

import { useState } from "react";
import { ArrowUpRight, Bell, BusFront, Check, MapPin, Route as RouteIcon } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

const actionClass = "group flex min-h-16 items-center gap-3 rounded-xl px-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export function QuickActions() {
  const { snapshot, unreadCount, selectStop } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-4 sm:px-6 sm:py-5">
      <h2 className="text-sm font-semibold text-navy-950">Explore</h2>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 lg:grid-cols-5">
        <Link href="/track" className={actionClass}>
          <MapPin className="h-[18px] w-[18px] shrink-0 text-brand-600" aria-hidden="true" />
          <span className="min-w-0 text-sm font-medium text-navy-950">Full map</span>
          <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </Link>
        <button type="button" onClick={() => setOpen(true)} className={actionClass}>
          <Check className="h-[18px] w-[18px] shrink-0 text-brand-600" aria-hidden="true" />
          <span className="min-w-0 text-sm font-medium text-navy-950">Select Stop</span>
        </button>
        <Link href="/routes" className={actionClass}>
          <RouteIcon className="h-[18px] w-[18px] shrink-0 text-brand-600" aria-hidden="true" />
          <span className="min-w-0 text-sm font-medium text-navy-950">Routes</span>
          <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </Link>
        <Link href="/notifications" className={actionClass}>
          <Bell className="h-[18px] w-[18px] shrink-0 text-brand-600" aria-hidden="true" />
          <span className="min-w-0 text-sm font-medium text-navy-950">Alerts{unreadCount > 0 ? ` (${unreadCount})` : ""}</span>
          <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </Link>
        <Link href="/bus-details" className={actionClass}>
          <BusFront className="h-[18px] w-[18px] shrink-0 text-brand-600" aria-hidden="true" />
          <span className="min-w-0 text-sm font-medium text-navy-950">Bus details</span>
          <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </Link>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Select your stop"
        description="Choose a stop to personalize the ETA shown on the dashboard and map."
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
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
                  "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  selected ? "border-brand-200 bg-brand-50" : "border-slate-100 hover:bg-slate-50",
                )}
              >
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600")}>{stop.order}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-950">{stop.name}</span>
                  <span className="block text-xs text-slate-500">{stop.landmark ?? "Route stop"}</span>
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
