import { FlaskConical, Radio, Satellite } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BusStatus } from "@/lib/types";

export function DemoModeBadge({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Badge tone="amber" className={cn("border border-amber-200", className)}>
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      <span className={cn("whitespace-nowrap", compact && "text-[9px] tracking-[0.08em]")}>
        DEMO MODE
      </span>
    </Badge>
  );
}

export function SimulatedTag({
  label = "Simulated",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-100",
        className,
      )}
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

export function LiveDataTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-100",
        className,
      )}
    >
      <Radio className="h-3 w-3" aria-hidden="true" />
      Device GPS
    </span>
  );
}

const statusConfig: Record<
  BusStatus,
  { label: string; tone: "green" | "amber" | "blue" | "neutral"; dot: string }
> = {
  "on-time": { label: "On Time", tone: "green", dot: "bg-emerald-500" },
  delayed: { label: "Delayed", tone: "amber", dot: "bg-amber-500" },
  arriving: { label: "Arriving", tone: "blue", dot: "bg-brand-500" },
  offline: { label: "Offline", tone: "neutral", dot: "bg-slate-400" },
};

export function StatusPill({
  status,
  className,
}: {
  status: BusStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <Badge tone={config.tone} className={cn("gap-2", className)}>
      <span className={cn("h-2 w-2 rounded-full", config.dot)} aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

export function SourceLabel({
  mode,
  className,
}: {
  mode: "live" | "simulation";
  className?: string;
}) {
  return mode === "live" ? (
    <LiveDataTag className={className} />
  ) : (
    <SimulatedTag label="Simulated data" className={className} />
  );
}

export function SatelliteHint({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-slate-500", className)}>
      <Satellite className="h-3.5 w-3.5" aria-hidden="true" />
      Location estimate
    </span>
  );
}
