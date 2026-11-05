"use client";

import { useState } from "react";
import { ArrowUpRight, Bell, BusFront, Check, MapPin, Route as RouteIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { useApp } from "@/state/app-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { DURATION, EASE_OUT, SPRING, TAP_SOFT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const actionClass = "group flex min-h-16 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

function ActionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors duration-200 group-hover:bg-brand-100">
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </span>
  );
}

function ActionLink({ href, icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <m.div variants={itemVariants} whileTap={TAP_SOFT} transition={SPRING.tap}>
      <Link href={href} className={actionClass}>
        <ActionIcon icon={icon} />
        <span className="min-w-0 text-sm font-medium text-navy-950">{label}</span>
        <ArrowUpRight
          className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600"
          aria-hidden="true"
        />
      </Link>
    </m.div>
  );
}

export function QuickActions() {
  const { snapshot, unreadCount, selectStop } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-4 sm:px-6 sm:py-5">
      <h2 className="text-sm font-semibold text-navy-950">Explore</h2>
      <m.div
        className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 lg:grid-cols-5"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
      >
        <ActionLink href="/track" icon={MapPin} label="Full map" />
        <m.div variants={itemVariants} whileTap={TAP_SOFT} transition={SPRING.tap}>
          <button type="button" onClick={() => setOpen(true)} className={actionClass}>
            <ActionIcon icon={Check} />
            <span className="min-w-0 text-sm font-medium text-navy-950">Select Stop</span>
          </button>
        </m.div>
        <ActionLink href="/routes" icon={RouteIcon} label="Routes" />
        <ActionLink href="/notifications" icon={Bell} label={`Alerts${unreadCount > 0 ? ` (${unreadCount})` : ""}`} />
        <ActionLink href="/bus-details" icon={BusFront} label="Bus details" />
      </m.div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Select your stop"
        description="Choose a stop to personalize the ETA shown on the dashboard and map."
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        <m.div
          className="space-y-1.5"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.025, delayChildren: 0.1 } } }}
        >
          {snapshot.route.stops.map((stop) => {
            const selected = stop.id === snapshot.selectedStop.id;
            return (
              <m.button
                key={stop.id}
                type="button"
                variants={itemVariants}
                whileTap={TAP_SOFT}
                onClick={() => {
                  selectStop(stop.id);
                  setOpen(false);
                }}
                aria-pressed={selected}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  selected ? "border-brand-200 bg-brand-50" : "border-slate-100 hover:bg-slate-50",
                )}
              >
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600")}>{stop.order}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-950">{stop.name}</span>
                  <span className="block text-xs text-slate-500">{stop.landmark ?? "Route stop"}</span>
                </span>
                <AnimatePresence>
                  {selected && (
                    <m.span
                      key="check"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={SPRING.snappy}
                    >
                      <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    </m.span>
                  )}
                </AnimatePresence>
              </m.button>
            );
          })}
        </m.div>
      </Dialog>
    </Card>
  );
}
