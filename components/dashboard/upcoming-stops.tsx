"use client";

import { BusFront, Check, ChevronRight, Clock3, MapPin } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { formatClock, formatDistance, formatEta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { SimulatedTag } from "@/components/ui/labels";
import { cn } from "@/lib/utils";
import type { ArrivalStatus } from "@/lib/types";

const statusMeta: Record<
  ArrivalStatus,
  { label: string; tone: "green" | "blue" | "amber" | "neutral" | "violet"; dot: string }
> = {
  departed: { label: "Departed", tone: "neutral", dot: "bg-slate-300" },
  arriving: { label: "Arriving", tone: "blue", dot: "bg-brand-500" },
  approaching: { label: "Approaching", tone: "amber", dot: "bg-amber-500" },
  upcoming: { label: "Upcoming", tone: "violet", dot: "bg-violet-500" },
  completed: { label: "Trip ended", tone: "green", dot: "bg-emerald-500" },
};

export function UpcomingStops({ limit = 5 }: { limit?: number }) {
  const { snapshot, selectStop } = useApp();
  const stops = snapshot.stopEtas.slice(0, limit);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Upcoming stops</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            ETAs update from route distance and simulated traffic.
          </p>
        </div>
        <SimulatedTag label="Estimates" />
      </CardHeader>
      <CardContent>
        {stops.length === 0 ? (
          <EmptyState
            title="No stops configured"
            description="Add at least two stops in the admin dashboard to see arrival estimates."
          />
        ) : (
          <ol className="relative space-y-1.5">
            {stops.map((item, index) => {
              const meta = statusMeta[item.status];
              const isLast = index === stops.length - 1;
              return (
                <li key={item.stop.id} className="relative pl-10">
                  {!isLast && (
                    <span
                      className="absolute left-[13px] top-8 h-[calc(100%-12px)] w-0.5 bg-slate-100"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "absolute left-0 top-3 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white text-[10px] font-extrabold shadow-sm",
                      item.isSelected
                        ? "bg-brand-600 text-white"
                        : item.status === "departed"
                          ? "bg-slate-100 text-slate-400"
                          : "bg-brand-50 text-brand-700",
                    )}
                    aria-hidden="true"
                  >
                    {item.status === "departed" ? <Check className="h-3.5 w-3.5" /> : item.stop.order}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectStop(item.stop.id)}
                    aria-pressed={item.isSelected}
                    className={cn(
                      "flex min-h-[68px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                      item.isSelected
                        ? "border-brand-200 bg-brand-50/70"
                        : "border-transparent hover:border-slate-100 hover:bg-slate-50",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-navy-950">{item.stop.name}</p>
                        <Badge tone={meta.tone} dot className="normal-case tracking-normal">
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {formatDistance(item.distanceMeters)} away
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          {item.status === "departed"
                            ? "Passed"
                            : `${formatClock(item.etaAt)} IST`}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-navy-950">
                        {item.status === "departed" ? "—" : formatEta(item.etaSeconds)}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        ETA
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <BusFront className="h-4 w-4" aria-hidden="true" />
            {snapshot.route.code} · {snapshot.bus?.number ?? "No bus assigned"}
          </span>
          <ButtonLink href="/routes" variant="ghost" size="sm" className="text-brand-700">
            All stops <ChevronRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
