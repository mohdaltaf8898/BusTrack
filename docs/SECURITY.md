# Security model

## Principles

1. **Demo mode is not an authorization boundary.** Client-side demo roles are for UX testing only.
2. **Real actions are authorized on the server.** API routes validate a Supabase Auth token and the database profile role for every privileged operation.
3. **Defense in depth.** RLS policies, foreign keys, check constraints, secure RPCs, and API validation overlap intentionally.
4. **Least privilege.** The public anon key can read public route metadata only. The service role key exists only in server route handlers.
5. **Privacy by default.** No off-duty driver location is exposed; students see only active-trip or recent last-known bus locations.
6. **Safe failure.** Missing credentials produce a clear 503/demo response; validation failures produce concise 4xx messages; unexpected errors return a generic 500.

## Roles

| Role | Demo UI | Backend permissions |
| --- | --- | --- |
| Student | Dashboard, tracking, routes, notifications, bus details, profile | Read public routes/stops/buses, active/recent shared locations, own notifications. Cannot write GPS, trips, routes, buses, stops, or delay reports. |
| Driver | Student pages + driver dashboard | Read own assignments/trips; start/end/share only assigned trips through validated API/RPC; submit GPS only when assigned, active, sharing ON. |
| Admin | All pages | Manage routes, stops, buses, driver assignments, trip state, and delay reports through validated server routes; read all location health. |

## Server API controls

`lib/server/auth.ts`:

- Reads the `Authorization: Bearer <access_token>` header.
- Calls `supabase.auth.getUser(token)` with the service-role client.
- Loads `profiles.role` from Postgres. Never trusts a role provided in the request body.
- Throws `401 UNAUTHORIZED`, `403 FORBIDDEN`, or `503 DEMO_MODE` as appropriate.

`lib/server/rate-limit.ts` applies a small in-memory bucket per user to location, trip, and admin routes. It is prototype-grade; use Redis or an edge limiter in production.

`lib/server/location.ts` and `lib/validation.ts` enforce:

- UUID trip ID and bounded bus ID.
- Latitude/longitude bounds and a Hyderabad-area bounding box.
- Maximum location age of 60 seconds and maximum future skew of 15 seconds.
- Heading `0–360`, speed `0–160 km/h`, accuracy `0–1000 m`.
- An 800m maximum off-route distance from a staff-verified polyline.
- Source fixed to `gps` by the server.

`app/api/locations/route.ts` additionally checks:

- Trip exists, is `active`, and has `sharing_enabled = true`.
- Bus belongs to the trip and its assigned route matches.
- Driver role is assigned to both the bus and trip; admin role may manage but cannot bypass trip/sharing state.
- `recordedAt` is fresh, the route is explicitly marked `verified`, and coordinates are inside the route corridor. Inferred seed/OSRM geometry is rejected for GPS.
- Inserts are written by the service-role client; direct client writes are revoked.

## Database RLS

All tables have RLS enabled.

- `profiles`: users read/update their own row; admins can manage profiles. A trigger blocks non-admin role changes while allowing the trusted database owner to bootstrap the first admin.
- `routes`, `stops`, `buses`: publicly readable; only admins have write policies. API routes use the service role for validated mutations.
- `trips`: authenticated users can read trip state; direct `INSERT/UPDATE/DELETE` grants are revoked from `anon`/`authenticated`. Writes use validated API routes or security-definer RPCs.
- `bus_locations`: authenticated users can read only their own driver-trip locations, active-trip locations, recent completed-trip last-known locations (15 minutes), or all locations if admin. Direct write grants are revoked.
- `notifications`: users read broadcasts or their own notifications; admins can insert/delete; broadcasts use `notification_reads` for per-user read state.
- `notification_reads`: users access only their own rows.
- `delay_reports`: readable by authenticated users; admin-only writes.
- `bus_location_health`: view uses `security_invoker = true` so underlying RLS still applies.

Foreign keys cascade only for trip-owned locations/notifications; route deletion is restricted while buses are assigned. A partial unique index allows only one active trip per bus.

## Secure RPCs

Authenticated users can invoke the role/assignment-checked trip functions `start_driver_trip`, `end_driver_trip`, `set_trip_location_sharing`, and `mark_notification_read` as permitted by each function. Direct client writes to trips and locations remain revoked.

The original `submit_bus_location` RPC only checked a bounding box; the later migration revokes its execution from `public`, `anon`, and `authenticated`. The shipped driver UI submits GPS through the server API, which additionally requires a staff-verified corridor and applies the tighter 800 m polyline check. The API's catalog road-route endpoint accepts fixed route IDs only and proxies no arbitrary URLs or user coordinates.

## Secret handling

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server | Supabase project URL; public. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server | Public anon key protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Used by `app/api/*` route handlers. Never expose. |
| `NEXT_PUBLIC_SITE_URL` | Browser/server | Public canonical URL. |
| `NEXT_PUBLIC_SIMULATION_SPEED_MULTIPLIER` | Browser | Demo tuning; not secret. |
| `NEXT_PUBLIC_STALE_LOCATION_SECONDS` | Browser | Demo tuning; not secret. |

`.env.example` contains empty placeholders only. `.gitignore` ignores `.env` and `.env*.local`.

## Privacy behavior

- A student page never calls `navigator.geolocation` for driver tracking.
- Driver device GPS starts only after: Supabase sign-in, assigned bus, server-authorized active trip ID, sharing enabled, and browser permission granted.
- Turning sharing off or ending a trip stops the watch and prevents future accepted writes.
- Last-known position is a bus position from an authorized active/recently completed trip, not an off-duty driver location.
- Contact details are placeholders; no actual college phone numbers are included.

## Production hardening checklist

- Replace the in-memory rate limiter with a distributed limiter.
- Add structured audit logging and alerting for rejected GPS writes, role changes, and admin mutations.
- Add device attestation or short-lived driver tokens for high-risk deployments.
- Add velocity/jump detection and route snapping using road-network geometry.
- Rotate the service role key if it is ever exposed; keep it in a Vercel encrypted environment variable.
- Review Supabase Auth redirect URLs, email templates, MFA, and password policy.
- Review RLS with `supabase test db` or equivalent policy tests after any schema change.
- Add CSP, HSTS, and security headers at the edge.
- Run a privacy review before collecting real driver location data.
- Add a data retention/deletion policy for `bus_locations` and `notifications`.

## Known prototype limitations

- The service-role API is the privileged GPS path; trip RPCs exist separately, but the weaker GPS RPC is not executable by browser roles.
- GPS checks use polyline distance from an operator-verified route, not map matching. Changing stop coordinates or order invalidates verification.
- The in-memory rate limiter is per server instance.
- Demo localStorage state can be modified by the browser and must never be treated as trusted server data.
- No SMS/WhatsApp/push provider is configured; browser notification permission is optional.
- Real GPS/Auth/Realtime have not been end-to-end tested with live credentials/devices in this repository.
