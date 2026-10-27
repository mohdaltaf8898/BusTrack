import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "@/lib/config";
import type { UserRole } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface ApiProfile {
  id: string;
  name: string;
  role: UserRole;
}

export interface AuthContext {
  client: SupabaseClient;
  user: User;
  profile: ApiProfile;
  accessToken: string;
}

export function getServerConfig() {
  const url = publicSupabaseConfig.url;
  const anonKey = publicSupabaseConfig.anonKey;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return {
    url,
    anonKey,
    serviceRoleKey,
    publicConfigured: Boolean(url && anonKey),
    fullyConfigured: Boolean(url && anonKey && serviceRoleKey),
  };
}

export function createAdminClient(): SupabaseClient {
  const config = getServerConfig();
  if (!config.fullyConfigured) {
    throw new ApiError(
      503,
      "DEMO_MODE",
      "Real backend API is not configured. Set the public Supabase URL/anon key and the server-only service role key, then apply the migration.",
    );
  }
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function normalizeRole(value: unknown): UserRole {
  return value === "driver" || value === "admin" ? value : "student";
}

/**
 * Validates a Supabase Auth access token on the server and reads the profile
 * using the service-role client. UI roles are never trusted by API routes.
 */
export async function requireApiUser(
  request: Request,
  roles?: UserRole[],
): Promise<AuthContext> {
  const token = getBearerToken(request);
  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "A Supabase access token is required.");
  }
  const client = createAdminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new ApiError(401, "INVALID_TOKEN", "The access token is invalid or expired.");
  }
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,name,role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError || !profile) {
    throw new ApiError(403, "PROFILE_MISSING", "No authorized profile exists for this account.");
  }
  const mapped: ApiProfile = {
    id: String(profile.id),
    name: typeof profile.name === "string" ? profile.name : "BusTrack user",
    role: normalizeRole(profile.role),
  };
  if (roles && !roles.includes(mapped.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      `This action requires the ${roles.join(" or ")} role.`,
    );
  }
  return { client, user: data.user, profile: mapped, accessToken: token };
}

export async function optionalApiUser(request: Request): Promise<AuthContext | null> {
  if (!getBearerToken(request)) return null;
  try {
    return await requireApiUser(request);
  } catch {
    return null;
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return {
      body: { error: error.message, code: error.code, demoMode: error.code === "DEMO_MODE" },
      status: error.status,
    };
  }
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return {
    body: { error: "The request could not be completed safely.", detail: message },
    status: 500,
  };
}
