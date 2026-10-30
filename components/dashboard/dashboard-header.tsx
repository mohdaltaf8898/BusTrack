"use client";

import Link from "next/link";
import { Bell, GraduationCap, MapPin, UserRound } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { greetingForHour, hourInTimeZone } from "@/lib/format";
import { Logo } from "@/components/brand";
import { RouteSelector } from "@/components/route-selector";
import { Badge } from "@/components/ui/badge";
import { SourceLabel } from "@/components/ui/labels";

export function DashboardHeader() {
  const { state, snapshot, unreadCount } = useApp();
  const greeting = greetingForHour(hourInTimeZone(state.currentTime));
  const firstName = state.user?.name.split(" ")[0] ?? "there";

  return (
    <section className="overflow-hidden rounded-3xl border border-white/70 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-1.5">
          <Link
            href="/notifications"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-navy-700 transition hover:bg-slate-50"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </Link>
          <Link
            href={state.user ? "/profile" : "/login"}
            aria-label="Open profile"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition hover:bg-brand-100"
          >
            {state.user ? (
              <span className="text-xs font-extrabold">{state.user.avatarInitials}</span>
            ) : (
              <UserRound className="h-5 w-5" aria-hidden="true" />
            )}
          </Link>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_260px] sm:items-end">
        <div>
          <p className="text-xs font-semibold text-brand-600">{greeting}, {firstName}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-[28px]">
            Your bus, before you wait.
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              Lords Institute of Engineering & Technology
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Hyderabad
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <RouteSelector className="w-full" />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
