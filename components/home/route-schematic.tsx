import { sampleRoutes } from "@/data/routes";
import { cn } from "@/lib/utils";

/**
 * The homepage signature: one blue line connecting numbered stops, drawn from
 * the published Route 01 pickup list. It is a static illustration — no map
 * tiles, no position, no claim of live tracking.
 */
export function RouteSchematic({ className }: { className?: string }) {
  const route = sampleRoutes[0];
  const stops = route.stops.slice(0, 6);
  const college = route.stops[route.stops.length - 1];
  const timed = stops.filter((stop) => stop.scheduledTime).length;

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-float",
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <span className="text-sm font-semibold text-navy-950">
          {route.code} · {route.startLocation}
          <span className="text-slate-400" aria-hidden="true"> → </span>
          {route.destination}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-100">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
          Estimated times
        </span>
      </figcaption>

      <div className="px-5 py-5">
        <ol className="relative space-y-4 border-l-2 border-brand-200 pl-6">
          {stops.map((stop, index) => {
            const last = index === stops.length - 1;
            return (
              <li key={stop.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ring-4 ring-white",
                    index === 0 ? "bg-brand-600 text-white" : "bg-white text-navy-800 ring-white border border-brand-200",
                  )}
                  aria-hidden="true"
                >
                  {stop.order}
                </span>
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-sm font-medium text-navy-950">{stop.name}</span>
                  <span className="font-mono text-xs text-slate-600">
                    {stop.scheduledTime ?? <span className="text-slate-400">time not published</span>}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {stop.landmark ?? (stop.lat === null ? "Stop not yet located on the map" : "Published pickup point")}
                  {last && !stop.landmark ? "" : ""}
                </span>
              </li>
            );
          })}
          <li className="relative">
            <span
              className="absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-[11px] font-semibold text-white ring-4 ring-white"
              aria-hidden="true"
            >
              {college.order}
            </span>
            <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-sm font-semibold text-navy-950">{college.name}</span>
              <span className="font-mono text-xs text-slate-600">
                {college.scheduledTime ?? "arrival time not published"}
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {route.stops.length - stops.length} more stops on this route
            </span>
          </li>
        </ol>
      </div>

      <p className="border-t border-slate-100 bg-surface-muted px-5 py-3 text-xs leading-5 text-slate-600">
        Illustration of the published 2025–26 pickup list — {timed} of the first {stops.length} stops
        carry a time. The signed-in dashboard turns this into a stop-by-stop estimate for your own
        boarding point.
      </p>
    </figure>
  );
}
