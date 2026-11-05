import { Satellite } from "lucide-react";
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
    <Badge tone="amber" className={cn("whitespace-nowrap", compact && "px-2", className)}>
      DEMO MODE
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
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-slate-600", className)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden="true" />
      {label}
    </span>
  );
}

export function LiveDataTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800", className)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
      Device GPS
    </span>
  );
}

const statusConfig: Record<BusStatus, { label: string; tone: "green" | "amber" | "blue" | "neutral"; dot: string }> = {
  "on-time": { label: "On time", tone: "green", dot: "bg-emerald-600" },
  delayed: { label: "Delayed", tone: "amber", dot: "bg-amber-600" },
  arriving: { label: "Arriving", tone: "blue", dot: "bg-brand-600" },
  offline: { label: "Offline", tone: "neutral", dot: "bg-slate-500" },
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
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

export function SourceLabel({
  mode,
  className,
}: {
  mode: "live" | "simulation" | "last-known";
  className?: string;
}) {
  if (mode === "live") return <LiveDataTag className={className} />;
  if (mode === "last-known") return <Badge tone="neutral" className={className}>Last known GPS</Badge>;
  return <SimulatedTag label="Simulated data" className={className} />;
}

export function SatelliteHint({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-slate-600", className)}>
      <Satellite className="h-4 w-4" aria-hidden="true" />
      Location estimate
    </span>
  );
}
