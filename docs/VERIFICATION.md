# Verification report

Checks on this branch in the development sandbox (Node 22.22.3, npm 10.9.8):

| Check | Result |
| --- | --- |
| `npm ci` | Passed with the committed lockfile |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; `next lint` reports its upstream deprecation notice |
| `npm test` | Passed: 12 files, 48 tests |
| `npm run build` | Passed; 12 static pages and five dynamic API routes |
| `npm audit` | 0 reported vulnerabilities at time of check |
| Local PostgreSQL-compatible migrations | Both migrations and seed applied in PGlite with stubbed Auth; 16 routes and 16 placeholder buses, role and GPS privilege tests passed |

## Browser and HTTP smoke checks

A temporary headless Chromium 153 run checked `/`, `/track`, `/routes`, `/bus-details` and `/profile` at widths 320, 375, 390, 430, 768 and 1440 px. No horizontal overflow or uncaught page errors were detected; historical stop selection, the unmapped location label, Route 10 ambiguity and dark ETA card contrast were checked. OSRM failure was mocked for these layout checks. This is not a real iPhone/Android or Safari test, and does not establish external tile availability.

The local production server returned `200` for the nine application pages and manifest; `/api/config` reported `demoMode: true`, unauthenticated GPS POST returned `401`, unconfigured admin read returned `503`, and an unknown road-route ID returned `404`. The fixed Route 01 road-routing request returned the labelled `503` straight-line fallback in this sandbox, which restricts outbound network access. Valid OSRM payloads and failure behavior are covered by mocks; hosted OSRM availability needs independent checking.

## Not verified

- The connected Supabase project reported `INACTIVE` with no active services. No hosted migrations, seed, keys, Auth, RLS, Realtime or GPS were configured or tested.
- Actual college pickup coordinates, the present-day timetable, official road traces, and real driver/device tracking.
- iPhone Safari/Android Chrome visual checks or operational OSM/OSRM production reliability.
- SMS, WhatsApp and push delivery (no provider configured).

The PGlite tests use a local Auth stub and do not replace hosted Supabase policy/integration tests. See [TESTING.md](TESTING.md) for the device and backend checklist.
