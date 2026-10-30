import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Inbox,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-slate-100 after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent",
        className,
      )}
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6" aria-busy="true" aria-label="Loading BusTrack">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-[320px] w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}

type AlertTone = "info" | "success" | "warning" | "error";

const alertConfig: Record<AlertTone, { classes: string; Icon: typeof Info }> = {
  info: { classes: "border-brand-100 bg-brand-50 text-brand-900", Icon: Info },
  success: { classes: "border-emerald-100 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  warning: { classes: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  error: { classes: "border-rose-200 bg-rose-50 text-rose-900", Icon: XCircle },
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
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-2xl border p-3.5 text-sm", classes, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        <div className={cn(title && "mt-0.5", "leading-6")}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1 hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
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
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-bold text-navy-950">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
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
      Browser offline — showing cached demo data. Live map tiles may be unavailable.
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
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-white/20", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, Math.min(100, value)))}
    >
      <div
        className={cn("h-full rounded-full bg-brand-400 transition-all duration-500", indicatorClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
