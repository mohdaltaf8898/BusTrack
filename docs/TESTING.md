# Testing guide

## Automated checks

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
# npm run check runs typecheck, tests and build together
```

The Vitest suites cover:

- All 16 historical routes, stop order/time transcription, nullable locations, route 10's ambiguous intermediate stop and route 11's inferred endpoint.
- Simulation movement on the displayed route geometry, ETAs/delays/offline behavior, and no invented ETA/arrival event for an unmapped stop.
- OSRM payload validation, ordered snapped waypoints, fixed-catalogue routing, failure fallback, stale-response rejection, verified-route protection, and simulation progress when geometry changes.
- Route/stop selection, displayed historical times and unknown locations, dashboard/driver/admin demo interactions, notifications, state persistence, and responsive navigation markup.
- API role checks, GPS payload/age/bounds validation, unverified-corridor rejection and on/off-corridor behavior with mocked server authorization.
- Mocked Realtime invalidation and authorized location reads, stale/in-flight response rejection, pause labels, identity changes and private backend-cache clearing.
- All four SQL migrations and the seed in a local PGlite/PostgreSQL-compatible database with stubbed Supabase Auth: 16 routes, role protections, GPS grants and guarded writes, idempotent seed and invalidation after stop edits.

The PGlite test is not a hosted Supabase test. It does not prove real Supabase RLS, Auth, Realtime, network access, or device GPS work in a project. Read [VERIFICATION.md](VERIFICATION.md) for the latest actual results.

### Real PostgreSQL lock-race test

For reproducible concurrent transaction checks, use a **fresh, disposable local PostgreSQL database** and a local superuser with permission to create test roles and the `pgcrypto` extension. Never point this test at Supabase or existing data. For example:

```bash
createdb -h 127.0.0.1 -U postgres bustrack_gps_test_run1
PGHOST=127.0.0.1 PGUSER=postgres PGDATABASE=bustrack_gps_test_run1 npm run test:gps-locks
```

The script refuses remote hosts, database names without the `bustrack_gps_test_` prefix, and non-empty databases. It creates test Auth stubs, applies migrations/seed, and exercises competing insert/pause/end transactions using separate connections. Drop the disposable database afterward.

## Manual browser checklist

Test on iPhone Safari and Android Chrome, and at 320, 375, 390, 430, 768 and 1440 pixels. Check touch targets, focus, readability and no horizontal overflow.

1. With no credentials, open `/`, `/track` and `/routes`. Confirm **DEMO MODE** and simulated position/ETA labels.
2. Select Route 01. The simulated marker starts at the approximate Asif Nagar point and follows the displayed geometry. The historical stop list says Pillar No. 26 is unmapped and its simulated ETA is unavailable.
3. Browse Route 10, select the intermediate “College” stop and confirm the 08:32 historical time, ambiguity note and missing map position. Check Route 11's inferred endpoint note and missing arrival time.
4. Select other routes and stops; confirm their stop lists, historical times, markers and ETA update without refresh. Check the route card button brings the selected stop list into view.
5. When OSRM responds, confirm the road-aligned estimate is labelled unverified. Block its endpoint and confirm the straight-line fallback is labelled. Block tiles/offline and confirm the schematic fallback and retry button.
6. Trigger a simulated delay, pause/resume, offline/restore, start/end trip and notification controls; check labels and last-known status.
7. Exercise driver/admin demo roles, validated CRUD, delete confirmations and local persistence. Verify transport contacts are placeholders.

## Configured backend checklist — requires a test project and driver device

1. Apply all four migrations and seed to a separate test project; confirm Auth users, roles, RLS and Realtime publication as in [SETUP.md](SETUP.md). They are already applied to the existing BusTrack project.
2. Without a verified corridor, confirm assigned driver GPS writes return `409 ROUTE_NOT_VERIFIED`. Obtain and review actual stop positions/trace; do not mark the estimated path verified.
3. Set the reviewed corridor, replace simulated vehicles, assign a driver, start an authorized trip on HTTPS, enable sharing and grant device location permission.
4. Verify the student view receives the real update, and that stale/future/off-route positions are rejected. Stop sharing/end the trip; confirm writes stop and privacy rules hold.
5. Confirm student tokens cannot mutate admin data or submit GPS, and verify RLS/Realtime directly against the actual Supabase project.
6. Test Safari/Chrome behavior with real tiles and spotty connectivity. No SMS, WhatsApp or push provider is configured.
