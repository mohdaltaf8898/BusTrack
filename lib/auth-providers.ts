import { isSupabaseConfigured, publicSupabaseConfig } from "@/lib/config";

export interface AuthProviderState {
  /** True only when Supabase reports the Google provider as enabled. */
  google: boolean;
  /** True when email/password sign-up is open. */
  emailSignUp: boolean;
  /** False when the settings endpoint could not be reached. */
  checked: boolean;
}

const UNKNOWN: AuthProviderState = { google: false, emailSignUp: true, checked: false };

let cached: AuthProviderState | null = null;
let inFlight: Promise<AuthProviderState> | null = null;

/**
 * Supabase publishes which external providers are switched on at
 * `GET {project}/auth/v1/settings`. Reading that endpoint means the Google
 * button appears only when the project really can complete the round trip,
 * instead of showing a control that always fails.
 */
export async function fetchAuthProviders(): Promise<AuthProviderState> {
  if (cached) return cached;
  if (!isSupabaseConfigured) return (cached = UNKNOWN);
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch(new URL("/auth/v1/settings", publicSupabaseConfig.url), {
        headers: { apikey: publicSupabaseConfig.anonKey },
        cache: "no-store",
      });
      if (!response.ok) return UNKNOWN;
      const settings = (await response.json()) as {
        external?: Record<string, boolean | undefined>;
        disable_signup?: boolean;
      };
      const state: AuthProviderState = {
        google: settings.external?.google === true,
        emailSignUp: settings.external?.email !== false && settings.disable_signup !== true,
        checked: true,
      };
      cached = state;
      return state;
    } catch {
      return UNKNOWN;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Test/reset helper so a provider change can be observed without a reload. */
export function resetAuthProviderCache() {
  cached = null;
  inFlight = null;
}
