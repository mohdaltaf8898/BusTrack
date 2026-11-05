"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/state/app-provider";
import { formatClock, formatEta } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export function UpcomingStops({ limit = 5 }: { limit?: number }) {
  const { snapshot, selectStop } = useApp();
  const stops = snapshot.stopEtas.filter((item) => item.status !== "departed").slice(0, limit);

  return (
    <Card className="h-full p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-navy-950">Upcoming stops</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">Simulated arrival estimates · select a stop to see its ETA.</p>
        </div>
        <Link href="/routes" className="inline-flex min-h-8 shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand-600">
          All stops <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      {stops.length === 0 ? (
        <div className="mt-6"><EmptyState title="No stops configured" description="Add stops in the admin dashboard to see arrival estimates." /></div>
      ) : (
        <ol className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
          {stops.map((item) => (
            <li key={item.stop.id}>
              <button
                type="button"
                onClick={() => selectStop(item.stop.id)}
                aria-pressed={item.isSelected}
                className={cn(
                  "flex min-h-[72px] w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  item.isSelected ? "bg-brand-50/70" : "hover:bg-slate-50",
                )}
              >
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  item.isSelected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600",
                )} aria-hidden="true">{item.stop.order}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-950">{item.stop.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-600">
                    {item.status === "unmapped" ? "Location not mapped" : item.status === "completed" ? "Trip ended" : item.status === "arriving" ? "Arriving" : item.status === "approaching" ? "Approaching" : "Upcoming"}
                    {item.etaAt ? ` · ${formatClock(item.etaAt)} IST` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-navy-950">
                  {formatEta(item.etaSeconds)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
        {snapshot.route.code} · {snapshot.bus?.number ?? "No bus assigned"} · Pickup points require confirmation.
      </p>
    </Card>
  );
}
