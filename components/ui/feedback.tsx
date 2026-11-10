"use client";

import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BusFront,
  CheckCircle2,
  Info,
  Inbox,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Placeholder block with a slow opacity pulse (opacity only: cheap to paint, and reduced-motion safe). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-slate-100 animate-skeleton-pulse motion-reduce:animate-none",
        className,
      )}
      aria-hidden="true"
    />
  );
}

/** A small bus on a moving dashed road: the loading mark for workspace screens. */
export function BusLoader({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)} role="status" aria-label={label}>
      <div className="relative h-12 w-28">
        <m.span
          className="absolute left-1/2 top-1 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-xl bg-brand-600 text-white shadow-glow"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <BusFront className="h-5 w-5" />
        </m.span>
        <svg className="absolute inset-x-0 bottom-0 h-2 w-full" viewBox="0 0 112 8" aria-hidden="true">
          <line
            x1="0"
            y1="4"
            x2="112"
            y2="4"
            stroke="rgb(188 218 255)"
            strokeWidth="2"
            strokeDasharray="10 14"
            strokeLinecap="round"
            className="animate-road-dash motion-reduce:animate-none"
          />
        </svg>
      </div>
      <span className="text-xs font-medium text-slate-500">{label}…</span>
    </div>
  );
}

const skeletonBlockVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

export function LoadingScreen() {
  return (
    <m.div
      className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6"
      aria-busy="true"
      aria-label="Loading BusTrack"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
    >
      <m.div variants={skeletonBlockVariants} className="flex items-center justify-between">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-28" />
      </m.div>
      <m.div variants={skeletonBlockVariants} className="relative">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="absolute inset-0 flex items-center justify-center">
          <BusLoader label="Loading your route" />
        </div>
      </m.div>
      <m.div variants={skeletonBlockVariants}>
        <Skeleton className="h-[320px] w-full rounded-3xl" />
      </m.div>
      <m.div variants={skeletonBlockVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </m.div>
    </m.div>
  );
}

type AlertTone = "info" | "success" | "warning" | "error";

// Tinted, borderless: alerts mostly sit inside cards, and a second frame
// inside the card frame reads as box-in-box.
const alertConfig: Record<AlertTone, { classes: string; Icon: typeof Info }> = {
  info: { classes: "bg-brand-50 text-brand-900", Icon: Info },
  success: { classes: "bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  warning: { classes: "bg-amber-50 text-amber-900", Icon: AlertTriangle },
  error: { classes: "bg-rose-50 text-rose-900", Icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  onDismiss,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
  onDismiss?: () => void;
}) {
  const { classes, Icon } = alertConfig[tone];
  return (
    <m.div
      role={tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
      className={cn("flex items-start gap-3 rounded-xl p-4 text-sm", classes, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {/* ~60ch keeps alert prose under 80 characters a line on wide layouts. */}
        <div className={cn(title && "mt-0.5", "max-w-[60ch] text-pretty leading-6")}>{children}</div>
      </div>
      {onDismiss && (
        <m.button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          whileTap={{ scale: 0.9 }}
          className="rounded-lg p-1 hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </m.button>
      )}
    </m.div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl bg-slate-50 px-6 py-12 text-center",
        className,
      )}
    >
      {/* A plain icon, not a tile; and a paragraph, not a heading, because an
          empty state is a message inside a section rather than a section. */}
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.08 }}
        className="mb-3 text-slate-500"
        aria-hidden="true"
      >
        {icon ?? <Inbox className="h-7 w-7" strokeWidth={1.5} />}
      </m.div>
      <p className="text-base font-medium text-navy-950">{title}</p>
      <p className="mt-1 max-w-md text-pretty text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </m.div>
  );
}

export function OfflineNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900",
        className,
      )}
      role="status"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      Browser offline — showing the last data cached in this browser. Live map tiles may be unavailable.
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-white/20", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <m.div
        className={cn("h-full rounded-full bg-brand-400", indicatorClassName)}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 26, mass: 0.8 }}
      />
    </div>
  );
}

/** Fades a block in/out as `show` changes, without leaving layout gaps while hidden. */
export function Collapsible({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <m.div
          key="collapsible"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { height: { duration: DURATION.base, ease: EASE_OUT }, opacity: { duration: 0.2, delay: 0.05 } } }}
          exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.22 }, opacity: { duration: 0.12 } } }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
