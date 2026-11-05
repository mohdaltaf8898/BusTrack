import { NextResponse } from "next/server";
import { backendConfig } from "@/lib/config";
import { getServerConfig } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export function GET() {
  const server = getServerConfig();
  return NextResponse.json(
    {
      publicConfigured: server.publicConfigured,
      serverConfigured: server.fullyConfigured,
      unconfigured: !server.fullyConfigured,
      realtimeConfigured: backendConfig.realtimeConfigured,
      simulationSpeedMultiplier: backendConfig.simulationSpeedMultiplier,
      staleLocationSeconds: backendConfig.staleLocationSeconds,
      message: server.fullyConfigured
        ? "Supabase server API is configured."
        : "Backend credentials are incomplete; API-backed actions are disabled until the service role key is set.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
