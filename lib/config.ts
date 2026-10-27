import { DEFAULT_SIMULATION_MULTIPLIER, DEFAULT_STALE_LOCATION_SECONDS } from "@/lib/simulation";
import type { BackendConfig } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const serviceRoleKey =
  typeof window === "undefined"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ""
    : "";

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const publicSupabaseConfig = { url, anonKey };

export const backendConfig: BackendConfig = {
  enabled: Boolean(url && anonKey && serviceRoleKey),
  demoMode: !(url && anonKey),
  publicConfigured: Boolean(url && anonKey),
  // A browser must never know whether a server-side secret exists. The UI only
  // needs to know whether public auth is configured; API routes do the rest.
  serverConfigured: typeof window === "undefined" ? Boolean(serviceRoleKey) : Boolean(url && anonKey),
  realtimeConfigured: Boolean(url && anonKey),
  simulationSpeedMultiplier: positiveNumber(
    process.env.NEXT_PUBLIC_SIMULATION_SPEED_MULTIPLIER,
    DEFAULT_SIMULATION_MULTIPLIER,
  ),
  staleLocationSeconds: positiveNumber(
    process.env.NEXT_PUBLIC_STALE_LOCATION_SECONDS,
    DEFAULT_STALE_LOCATION_SECONDS,
  ),
};

export const isSupabaseConfigured = backendConfig.publicConfigured;
