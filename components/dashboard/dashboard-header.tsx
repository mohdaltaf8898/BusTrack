"use client";

import { useApp } from "@/state/app-provider";
import { greetingForHour, hourInTimeZone } from "@/lib/format";
import { RouteSelector } from "@/components/route-selector";

export function DashboardHeader() {
  const { state } = useApp();
  const greeting = greetingForHour(hourInTimeZone(state.currentTime));
  const firstName = state.user?.name.split(" ")[0] ?? "there";

  return (
    <section className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:pb-8">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">BusTrack / Overview</p>
        <h1 className="mt-2 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.045em] text-navy-950">
          Your commute.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          {greeting}, {firstName}. See your route and estimated arrival at a glance.
        </p>
      </div>
      <div className="w-full min-w-0 sm:max-w-[290px]">
        <RouteSelector className="w-full" />
      </div>
    </section>
  );
}
