import type { AppUser, UserRole } from "@/lib/types";

/**
 * Demo identities were removed from the product, so tests build a signed-in
 * Supabase user explicitly instead of relying on a local demo role.
 */
export function signedInUser(role: UserRole, overrides: Partial<AppUser> = {}): AppUser {
  const base: Record<UserRole, AppUser> = {
    student: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Test Student",
      email: "student@example.edu",
      role: "student",
      avatarInitials: "TS",
      assignedRouteId: "route-01",
      provider: "supabase",
    },
    driver: {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Test Driver",
      email: "driver@example.edu",
      role: "driver",
      avatarInitials: "TD",
      assignedBusId: "bus-sim01",
      assignedRouteId: "route-01",
      provider: "supabase",
    },
    admin: {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Test Administrator",
      email: "admin@example.edu",
      role: "admin",
      avatarInitials: "TA",
      provider: "supabase",
    },
  };
  return { ...base[role], ...overrides };
}
