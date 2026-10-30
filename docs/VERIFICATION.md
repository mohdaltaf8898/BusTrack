# Verification report

Checks on this branch in the development sandbox (Node 22.22.3, npm 10.9.8):

| Check | Result |
| --- | --- |
| `npm ci` | Passed with the committed lockfile |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; `next lint` reports its upstream deprecation notice |
| `npm test` | Passed: 14 files, 55 tests |
| `npm run build` | Passed; 12 static pages and five dynamic API routes |
| `npm audit` | 0 reported vulnerabilities at time of check |
| Local PostgreSQL-compatible migrations | All three migrations and seed applied in PGlite with stubbed Auth; 16 routes and 16 placeholder buses, role and GPS privilege tests passed |

## Browser and HTTP smoke checks

A temporary headless Chromium 153 run checked `/`, `/track`, `/routes`, `/bus-details` and `/profile` at widths 320, 375, 390, 430, 768 and 1440 px. No horizontal overflow or uncaught page errors were detected; historical stop selection, the unmapped location label, Route 10 ambiguity and dark ETA card contrast were checked. OSRM failure was mocked for these layout checks. This is not a real iPhone/Android or Safari test, and does not establish external tile availability.

The local production server in credential-free mode returned `200` for the application pages and manifest; `/api/config` reported `demoMode: true`, unauthenticated GPS POST returned `401`, unconfigured admin read returned `503`, and an unknown road-route ID returned `404`. The fixed Route 01 road-routing request returned the labelled `503` straight-line fallback in this sandbox, which restricts outbound network access. Valid OSRM payloads and failure behavior are covered by mocks; hosted OSRM availability needs independent checking.

## Hosted Supabase setup

The active **BusTrack** project was initially empty. Three migrations and the insert-only seed were applied; the hosted tables contain 16 historical routes, 154 stop rows (37 without coordinates, 9 without times) and 16 placeholder buses. Row-content hashes matched the locally generated seed. All nine application tables have RLS enabled, and `bus_locations` and `notifications` are in the Realtime publication. An anonymous database session could read routes but not profiles. Hosted privilege checks confirmed anonymous trip-function access and authenticated direct GPS writes/legacy GPS RPC are denied; authenticated trip functions remain available. These checks do not exhaustively prove every RLS policy.

No Auth users, verified route corridors, trips or actual GPS readings were created. Public sign-ups were disabled; an authorized operator must create accounts, promote roles and assign buses. The Vercel production environment was configured with the public project URL/anon key and a server-only sensitive service-role key. It does not expose the service role to the browser. Auth sign-in and Realtime delivery still need tests with actual accounts.

## Not verified

- Full hosted Auth, RLS, Realtime and driver-device GPS end-to-end, including sign-in and push delivery.
- Actual college pickup coordinates, the present-day timetable, official road traces, and real driver/device tracking.
- iPhone Safari/Android Chrome visual checks or operational OSM/OSRM production reliability.
- SMS, WhatsApp and push delivery (no provider configured).

The PGlite tests use a local Auth stub and do not replace hosted Supabase integration tests. See [TESTING.md](TESTING.md) for the device and backend checklist.
