"use client";

import { useApp } from "@/state/app-provider";
import { RouteSelector } from "@/components/route-selector";

export function DashboardHeader() {
  const { snapshot } = useApp();

  return (
    <section className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:pb-8">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-600">Your route · {snapshot.route.code}</p>
        <h1 className="mt-2 max-w-3xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.1] tracking-[-0.045em] text-navy-950">
          {snapshot.route.startLocation} <span className="text-slate-500" aria-label="to">→</span> {snapshot.route.destination}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          Selected stop: {snapshot.selectedStop.name}. Arrival times below are estimates, not a live timetable.
        </p>
      </div>
      <div className="w-full min-w-0 sm:max-w-[290px]">
        <RouteSelector className="w-full" />
      </div>
    </section>
  );
}
