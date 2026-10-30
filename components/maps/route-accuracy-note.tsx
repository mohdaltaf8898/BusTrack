import { mappedStopCount } from "@/lib/road-routing";
import type { Route } from "@/lib/types";

/** Explain route confidence without implying that a shortest road is the bus's actual path. */
export function RouteAccuracyNote({ route }: { route: Route }) {
  const mapped = mappedStopCount(route);
  const missing = route.stops.length - mapped;
  return (
    <p className="text-[11px] leading-5 text-slate-500">
      {route.geometrySource === "road"
        ? "Road-aligned estimate via OpenStreetMap / OSRM, not a verified bus path."
        : route.geometrySource === "verified"
          ? "Route geometry supplied by transport staff."
          : "Straight-line preview while road routing is unavailable or loading."}{" "}
      {mapped} of {route.stops.length} stops have approximate mapped locations
      {missing > 0 ? `; ${missing} still need coordinates` : ""}. Confirm pickup points with the transport office. Contains data provided by TGSRTC.
    </p>
  );
}
