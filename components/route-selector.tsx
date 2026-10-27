"use client";

import { useApp } from "@/state/app-provider";
import { Label, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function RouteSelector({
  className,
  showLabel = true,
  compact = false,
}: {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const { state, selectRoute } = useApp();
  return (
    <div className={cn("min-w-0", className)}>
      {showLabel && <Label htmlFor="route-selector">Selected route</Label>}
      <Select
        id="route-selector"
        aria-label="Selected bus route"
        value={state.selectedRouteId}
        onChange={(event) => selectRoute(event.target.value)}
        className={cn(compact ? "h-10 min-h-10 py-0 text-xs" : "", "font-semibold")}
      >
        {state.routes.map((route) => (
          <option key={route.id} value={route.id}>
            {route.code} · {route.name} ({route.busNumber})
          </option>
        ))}
      </Select>
    </div>
  );
}
