"use client";

import { ArrowUpRight, GraduationCap, MapPin } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { greetingForHour, hourInTimeZone } from "@/lib/format";
import { RouteSelector } from "@/components/route-selector";
import { Badge } from "@/components/ui/badge";
import { SourceLabel } from "@/components/ui/labels";

export function DashboardHeader() {
  const { state, snapshot } = useApp();
  const greeting = greetingForHour(hourInTimeZone(state.currentTime));
  const firstName = state.user?.name.split(" ")[0] ?? "there";

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-brand-100" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-brand-50/80 blur-3xl" aria-hidden="true" />
      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-end lg:gap-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
            BusTrack · your commute
          </p>
          <h1 className="mt-3 max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-[1.12] tracking-tight text-navy-950">
            Your bus, before you wait.
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            {greeting}, {firstName}. Pick your route and see the next estimated arrival.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              Lords Institute of Engineering &amp; Technology
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
              Hyderabad
            </span>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-brand-100 bg-brand-50/70 p-3.5 sm:p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-navy-700">Your route</p>
            <ArrowUpRight className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </div>
          <RouteSelector className="w-full" />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge tone={snapshot.route.status === "active" ? "green" : "amber"} dot>
              {snapshot.route.status}
            </Badge>
            <SourceLabel mode={snapshot.dataMode} />
          </div>
        </div>
      </div>
    </section>
  );
}
