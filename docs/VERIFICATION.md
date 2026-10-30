# Verification report

Checks on this branch in the development sandbox (Node 22.22.3, npm 10.9.8):

| Check | Result |
| --- | --- |
| `npm ci` | Passed with the committed lockfile |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; `next lint` reports its upstream deprecation notice |
| `npm test` | Passed: 17 files, 80 tests |
| `npm run build` | Passed; 12 static pages and five dynamic API routes |
| `npm audit` | 0 reported vulnerabilities at time of check |
| Local PostgreSQL-compatible migrations | All four migrations and seed applied in PGlite with stubbed Auth; role, GPS privilege and guarded-write tests passed |
| PostgreSQL 17.10 concurrency | Separate local connections verified pause/end races, legacy-insert trigger, stale-after-lock, role/geometry changes and completed-trip sharing guards |

## Browser and HTTP smoke checks

A temporary headless Chromium 153 run checked `/`, `/track`, `/routes`, `/bus-details` and `/profile` at widths 320, 375, 390, 430, 768 and 1440 px. No horizontal overflow or uncaught page errors were detected; historical stop selection, the unmapped location label, Route 10 ambiguity and dark ETA card contrast were checked. OSRM failure was mocked for those layout checks; a separate run rendered a synthetic 301-point road geometry on the dashboard, tracking and bus-details maps. This is not a real iPhone/Android or Safari test, and does not establish external tile availability.

The local production server in credential-free mode returned `200` for the application pages and manifest; `/api/config` reported `demoMode: true`, unauthenticated GPS POST returned `401`, unconfigured admin read returned `503`, and an unknown road-route ID returned `404`. The fixed Route 01 road-routing request returned the labelled `503` straight-line fallback in this sandbox, which restricts outbound network access. A separate Chromium run with public Supabase configuration and mocked backend responses rendered the dashboard, tracking, bus details, routes and login at 375, 430 and 1440 px without uncaught errors or horizontal overflow.

## Hosted Supabase setup

The active **BusTrack** project was initially empty. Four migrations and the insert-only seed were applied; the hosted tables contain 16 routes from the 2025–26 document, 154 stop rows (37 without coordinates, 9 without times) and 16 placeholder buses. On 30 October 2026 the requester reported that the routes remain the same; current pickup times and coordinates were not independently verified. Row-content hashes matched the locally generated seed. All nine application tables have RLS enabled, and `bus_locations` and `notifications` are in the Realtime publication. The anonymous REST API returned route rows; a transactional RLS check with a temporary profile confirmed anonymous users cannot read profiles. Another rolled-back test confirmed Auth inserts create student profiles and a student cannot promote their own role. Hosted privilege checks confirmed anonymous trip-function access and authenticated direct GPS writes/legacy GPS RPC are denied; authenticated trip functions remain available. The guarded GPS RPC is executable by `service_role` only and both GPS triggers are enabled. A rolled-back hosted test accepted one authorized test reading, then rejected guarded and legacy inserts after sharing was paused and confirmed the trip timestamp update. These checks do not exhaustively prove every RLS policy.

No Auth users, verified route corridors, trips or actual GPS readings were retained. Public sign-ups were disabled; an authorized operator must create accounts, promote roles and assign buses. The Vercel production environment was configured with the public project URL/anon key and a server-only sensitive service-role key. It does not expose the service role to the browser. After deployment, `/api/config` reported configured, `/api/admin` returned the real seeded routes and no private drivers/trips anonymously, and unauthenticated location requests were rejected. The hosted Route 01 OSRM endpoint returned road-aligned geometry; other routes and future availability were not checked. Public route and login pages loaded in the external fetch tool, but its requests for the dashboard and map pages failed for an undetermined reason; those pages were verified locally as described above. Auth sign-in and Realtime delivery still need tests with actual accounts.

## Not verified

- Full hosted Auth, RLS, Realtime and driver-device GPS end-to-end, including sign-in and push delivery.
- Actual college pickup coordinates, the present-day timetable, official road traces, and real driver/device tracking.
- iPhone Safari/Android Chrome visual checks or operational OSM/OSRM production reliability.
- SMS, WhatsApp and push delivery (no provider configured).

The PGlite tests use a local Auth stub and do not replace hosted Supabase integration tests. See [TESTING.md](TESTING.md) for the device and backend checklist.
