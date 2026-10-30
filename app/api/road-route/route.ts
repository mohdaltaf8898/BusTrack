import { NextResponse } from "next/server";
import { sampleRoutes } from "@/data/routes";
import { roadGeometryFromOsrm } from "@/lib/road-routing";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Route only the fixed published catalog; never proxy arbitrary user URLs or
 * coordinates. OSRM's public demo service is best-effort, not an SLA. Results
 * are cached and a labelled straight-line preview remains available on failure.
 */
export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`road-route:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Please try the road map again shortly." }, { status: 429 });
  }
  const routeId = new URL(request.url).searchParams.get("routeId");
  const route = sampleRoutes.find((item) => item.id === routeId);
  if (!route) return NextResponse.json({ error: "Route not found." }, { status: 404 });

  const coordinates = route.stops
    .filter((stop) => stop.lat != null && stop.lng != null)
    .map((stop) => `${stop.lng},${stop.lat}`)
    .join(";");
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, {
      headers: { "User-Agent": "BusTrack/1.0 (college route prototype)" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("Road routing is temporarily unavailable.");
    const result = roadGeometryFromOsrm(route, await response.json());
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json(
      { error: "Road routing is unavailable; the map is showing a straight-line preview." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
