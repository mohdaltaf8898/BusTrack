import { sampleRoutes } from "@/data/routes";

const stopCount = sampleRoutes.reduce((total, route) => total + route.stops.length, 0);
const locatedCount = sampleRoutes.reduce(
  (total, route) => total + route.stops.filter((stop) => stop.lat !== null).length,
  0,
);
const timedCount = sampleRoutes.reduce(
  (total, route) => total + route.stops.filter((stop) => Boolean(stop.scheduledTime)).length,
  0,
);

/**
 * Homepage figures, computed from the published route data rather than typed
 * in, so the introduction can never drift from the catalog behind sign-in.
 */
export const HOME_STATS = {
  routes: sampleRoutes.length,
  stops: stopCount,
  located: locatedCount,
  unlocated: stopCount - locatedCount,
  timed: timedCount,
  scheduleYear: sampleRoutes[0].scheduleYear ?? "2025–26",
};
