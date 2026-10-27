# Supabase SQL

This folder contains the optional backend definition for BusTrack. The app works fully without these files; they enable server-authorized real GPS, Supabase Auth roles, Realtime location updates, and persistent admin data.

## Files

- `migrations/20261027000000_init.sql` — tables, constraints, indexes, triggers, RLS policies, health view, secure RPCs, and Realtime publication setup.
- `seed.sql` — three sample Hyderabad-area routes, their ordered stops, and three buses. No credentials, real contacts, or personal data are included.

## Apply order

1. `migrations/20261027000000_init.sql`
2. `seed.sql`
3. Role/assignment SQL from [`docs/SETUP.md`](../docs/SETUP.md)

Do not run `seed.sql` before the migration. Re-running the seed is safe: it uses `ON CONFLICT` upserts.

## Important design choices

- `profiles.role` defaults to `student`; a trigger prevents non-admins from escalating their own role.
- `trips` and `bus_locations` have no direct client write grants; writes flow through validated API routes or security-definer RPCs.
- Only one active trip per bus is allowed by a partial unique index.
- `bus_locations` RLS exposes only active-trip, own-driver, recent-completed-trip, or admin-readable positions.
- `bus_location_health` uses `security_invoker = true` so the view cannot bypass RLS.
- Realtime is enabled for `bus_locations` and `notifications` if the `supabase_realtime` publication exists.
- Coordinates are approximate prototype geometry, not verified road routes or official college bus paths.

For the full security model, see [`docs/SECURITY.md`](../docs/SECURITY.md). For real GPS authorization and validation, see [`docs/REAL_GPS.md`](../docs/REAL_GPS.md).
