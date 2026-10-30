# BusTrack — college bus tracking

A mobile-first Next.js application for Lords Institute of Engineering and Technology, Hyderabad. It includes a student dashboard, route browser, map, notifications, driver and admin workspaces, and an optional Supabase backend.

## What the data means

- **Routes and times:** the 16 morning route lists and available times are transcribed from the user-supplied [2025–26 route document](https://www.scribd.com/document/910336742/BUS-Routes-25-26). On 30 October 2026, the requester reported that the same routes are still in use. This has not been independently verified; listed pickup times remain from the historical timetable and should be confirmed with the college.
- **Uncertain fields:** times missing or unclear in the document remain blank. Route 10's intermediate “College” at 08:32 is ambiguous and has no assumed position. Route 11's final college stop is inferred from an older college transport page; its 2025–26 arrival time is not given.
- **Map:** the document does not contain coordinates or bus traces. Some markers are nearby TGSRTC stops, OpenStreetMap landmarks or an approximate college centroid—not verified pickup points. Unresolved stops are shown without markers or ETAs. Contains data provided by TGSRTC; OpenStreetMap contributors provide map data.
- **Vehicle location and ETA:** without a configured backend, vehicle IDs (`SIM-*`), positions, traffic, ETAs and alerts are simulated. Even with live GPS, the ETA model still uses simulated traffic. The app retains the **DEMO MODE** indicator and labels the data source; it must not be represented as an operational transport service.
- **Contacts:** transport-office and driver contact values are placeholders. No historical driver phone numbers were imported.

The route map attempts a road-aligned estimate through the mapped points using the public OSRM demo service. It is **not** the official bus path: a shortest driving route, approximate markers, missing stops, one-way roads and road closures may all differ from the actual service. If OSRM is unavailable, a labelled straight-line preview is used. For accurate routes, transport staff must supply verified pickup coordinates and an actual approved route trace.

## Quick start

Requirements: Node.js 20.9+ (or Node 22/24), npm, and a modern browser. Node 22 was used for local checks.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Leave the Supabase variables unset for the credential-free simulation. Demo edits and route selection are stored in localStorage under `bustrack:demo-state:v2`; the previous demonstration catalogue is not loaded into the new version.

```bash
npm run typecheck
npm run lint
npm test
npm run build
# or: npm run check  (typecheck + tests + build)
```

The app is mobile-first: `/` is the dashboard; `/track`, `/routes`, `/notifications`, `/bus-details`, `/driver`, `/admin`, `/login` and `/profile` provide the other flows. In demo mode, login offers local role switching solely for testing. It is **not** authorization.

## Supabase setup

The hosted BusTrack project has the schema and historical seed installed. The Vercel production environment is configured for it; local development remains credential-free unless you supply your own environment variables. Connecting Supabase does not make the timetable current or create live GPS. Public sign-ups are disabled; authorized users must be created in Supabase Auth.

To set up a separate authorized project, follow the full [setup guide](docs/SETUP.md):

1. Create a Supabase project and open its SQL editor. Run these files **in order**:
   1. `supabase/migrations/20261030135413_bustrack_init.sql`
   2. `supabase/migrations/20261030135426_bustrack_published_routes.sql`
   3. `supabase/migrations/20261030140136_bustrack_function_grants.sql`
   4. `supabase/migrations/20261030144351_bustrack_guarded_gps.sql`
   5. `supabase/seed.sql`
2. The seed inserts the historical routes and `SIM-*` placeholder vehicles without overwriting existing rows. Replace placeholders and verify the current timetable, stop locations and route corridor with transport staff. Existing older demo rows are not automatically deleted.
3. Create Auth users in Supabase. The trigger creates student profiles; use the trusted SQL editor to promote the first admin and drivers and assign real vehicles as explained in [SETUP.md](docs/SETUP.md).
4. Copy `.env.example` to `.env.local` and set the project URL, public anon key and **server-only** service-role key. Never paste secret keys into chat, commit them, or prefix them with `NEXT_PUBLIC_`.
5. Restart the app. For Vercel, set the same variables in Project Settings → Environment Variables and redeploy; configure the HTTPS site URL in Supabase Auth.
6. Test roles, RLS, Realtime, assigned driver sharing and the live GPS path with a test project/device before a pilot. The location API refuses real GPS until an operator supplies a **verified** route corridor. Inferred OSRM paths cannot be used to authorize GPS.

A successful `/api/config` response with `serverConfigured: true` only indicates environment variables are present; it does **not** prove Auth, RLS, Realtime or GPS work. See [real GPS](docs/REAL_GPS.md), [security](docs/SECURITY.md) and [deployment](docs/DEPLOYMENT.md).

## Architecture

- Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide and reusable UI primitives.
- Leaflet/OpenStreetMap raster tiles; responsive schematic fallback when tiles fail. `/api/road-route` calls the public OSRM demo server for a fixed catalogue route only, caches valid responses, and falls back when it cannot route. Public OSRM and OSM tiles have no production SLA; use suitable providers for production traffic.
- `data/lords-routes-2025-26.json` is the persistent source transcription; `data/routes.ts` creates domain routes and simulation-only vehicles.
- `lib/geo.ts`, `lib/eta.ts`, `lib/simulation.ts`, and `lib/road-routing.ts` implement geometry, estimates and movement. Simulated movement uses the same geometry shown on the map.
- `state/app-provider.tsx` handles selected route, demo state, optional backend and Realtime. Server API handlers validate roles and keep privileged credentials server-side.
- `supabase/migrations/` contains tables, RLS, secure trip actions and the historical-route migration. `scripts/generate_seed.py` regenerates the insert-only seed from the JSON catalogue.
- `tests/` covers route data, unknown stops, maps and routing fallback, simulation, UI flows, authentication, GPS validation, and SQL migrations using a local PostgreSQL-compatible test database.

## Security and limitations

- Supabase service-role secrets stay server-side; client demo roles cannot authorize server actions. The API validates the user's token, role, assignment, active trip and sharing state, location age, Hyderabad bounds, and distance from a **verified** route corridor. GPS writes recheck mutable state under database row locks; direct client GPS inserts and the older, weaker GPS RPC are revoked.
- Real GPS, hosted RLS/Realtime, mobile Safari/Chrome rendering, and driver-device operation have **not** been end-to-end verified in this environment. The rate limiter is in-memory, not suitable for multi-instance production. A privacy review, retention policy, monitoring and a security review are needed before collecting real locations.
- Browser notifications require permission; SMS, WhatsApp and push providers are not configured. The map requires network access for tiles and road routing; the schematic/straight-line fallbacks remain available.
- This is a prototype, not an official service or navigation tool. Do not use its estimates to make transport or safety decisions.

See [testing](docs/TESTING.md) and [verification](docs/VERIFICATION.md) for what was actually checked.
