# Verification report

This file records the checks run on this branch. It intentionally distinguishes automated/HTTP verification from integrations that cannot be tested without credentials or a real device.

## Environment

- Node.js `v22.22.3`
- npm `10.9.8`
- Next.js `15.5.28`
- No Supabase credentials configured (`demoMode: true`)
- No browser automation binary available in the sandbox; component tests use jsdom

## Automated checks

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed — `tsc --noEmit`, no errors |
| `npm run lint` | Passed — no ESLint warnings or errors |
| `npm run test` | Passed — **6 test files, 31 tests** |
| `npm run build` | Passed — compiled successfully, 12/12 static pages generated |
| `npm run check` | Passed — exit code 0 (typecheck + tests + build) |

### Test coverage

- Pure simulation/ETA/geometry engine tests.
- Reducer/persistence/notification/admin CRUD tests.
- API security, payload, timing, and route-corridor validation tests.
- Server-side student-role rejection test.
- Responsive AppShell component test.
- **UI interaction tests** for:
  - student route selection, delay injection, offline/restore, and end-trip flow;
  - driver demo start/end/reset trip flow;
  - demo login role switching;
  - admin add-bus dialog and table update;
  - correct Route A/Route B starting marker coordinates.

## Production server smoke checks

A production `next start` server bound to `0.0.0.0:3000` returned:

| Path | Result |
| --- | --- |
| `/`, `/track`, `/routes`, `/notifications`, `/bus-details` | `200 OK` |
| `/driver`, `/admin`, `/login`, `/profile` | `200 OK` |
| `/manifest.webmanifest`, `/icons/icon.svg` | `200 OK` |
| `/api/config` | `200 OK`, `demoMode: true`, `serverConfigured: false` |
| `POST /api/locations` without token | `401 UNAUTHORIZED` |
| `GET /api/admin` without backend | `503 DEMO_MODE` |

Rendered HTML checks:

- `DEMO MODE` badge present.
- “Know Before You Go” tagline present.
- LIET Hyderabad context present.
- Mobile bottom navigation (`md:hidden`) and desktop sidebar (`md:flex`) class hooks present.
- Responsive viewport metadata and PWA manifest link present.
- No service-role variable or secret value present.

## Build route summary

The production build generated:

- Ten prerendered application pages including `/_not-found`.
- Four dynamic API routes: `/api/admin`, `/api/config`, `/api/locations`, `/api/trips`.
- Shared first-load JS of approximately 103 kB.

## Not verified here

The following require external configuration/devices and are **not claimed operational**:

- Supabase Auth sign-in with real credentials.
- Supabase Realtime delivery from a real project.
- Browser Geolocation on a real driver device over HTTPS.
- Live `bus_locations` ingestion and RLS behavior against a hosted database.
- OSM tile rendering in a real browser (the schematic fallback is implemented).
- iPhone Safari / Android Chrome visual checks at multiple viewport sizes.
- SMS/WhatsApp/push delivery (no provider configured).

Use [`docs/TESTING.md`](TESTING.md) for the manual browser/device checklist and [`docs/REAL_GPS.md`](REAL_GPS.md) for the device GPS test sequence.
