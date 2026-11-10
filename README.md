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

Open `http://localhost:3000`. You land on the public homepage; every application screen behind it requires a signed-in account. There is no demo mode and no role-switching shortcut, so `.env.local` must point at a Supabase project before the app is usable. See [docs/SETUP.md](docs/SETUP.md) for credentials, [docs/EMAIL.md](docs/EMAIL.md) for the free SMTP setup that confirmation and reset emails need, and [docs/AUTH.md](docs/AUTH.md) for email sign-up and the Google button. Route selection and cached data are stored in localStorage under `bustrack:app-state:v2`.

```bash
npm run typecheck
npm run lint
npm test
npm run build
# or: npm run check  (typecheck + tests + build)
```

The app is mobile-first: `/` is the public homepage; `/dashboard` is the signed-in student home; `/track`, `/routes`, `/notifications`, `/bus-details`, `/driver`, `/admin` and `/profile` provide the other flows and are wrapped by the same `RequireAuth` shell. `/login`, `/signup`, `/auth/callback` and `/auth/set-password` are the public authentication screens. The client shell is a navigation guard; authorization is enforced server-side by the user's actual Supabase role.

## Supabase setup

The hosted BusTrack project has the schema and historical seed installed. The Vercel production environment is configured for it; local development remains credential-free unless you supply your own environment variables. Connecting Supabase does not make the timetable current or create live GPS. The login page supports student sign-up, sign-in and password reset, subject to the project's Auth settings and email-delivery configuration. Only a trusted administrator can authorize driver/admin roles.

To set up a separate authorized project, follow the full [setup guide](docs/SETUP.md):

1. Create a Supabase project and open its SQL editor. Run these files **in order**:
   1. `supabase/migrations/20261030135413_bustrack_init.sql`
   2. `supabase/migrations/20261030135426_bustrack_published_routes.sql`
   3. `supabase/migrations/20261030140136_bustrack_function_grants.sql`
   4. `supabase/migrations/20261030144351_bustrack_guarded_gps.sql`
   5. `supabase/migrations/20261105120000_bustrack_oauth_profile_name.sql` (Google/OAuth display names)
   6. `supabase/seed.sql`
2. The seed inserts the historical routes and `SIM-*` placeholder vehicles without overwriting existing rows. Replace placeholders and verify the current timetable, stop locations and route corridor with transport staff. Existing older demo rows are not automatically deleted.
3. Create accounts through the student sign-up screen — email/password, or **Continue with Google** once the provider is enabled ([docs/AUTH.md](docs/AUTH.md)) — after configuring custom SMTP, or create authorized staff users in Supabase Auth. The trigger creates student profiles; use the trusted SQL editor to promote the first admin and drivers and assign real vehicles as explained in [SETUP.md](docs/SETUP.md).
4. Copy `.env.example` to `.env.local` and set the project URL, public anon key and **server-only** service-role key. Never paste secret keys into chat, commit them, or prefix them with `NEXT_PUBLIC_`.
5. Restart the app. For Vercel, set the same variables in Project Settings → Environment Variables and redeploy; configure the HTTPS site URL in Supabase Auth.
6. Test roles, RLS, Realtime, assigned driver sharing and the live GPS path with a test project/device before a pilot. The location API refuses real GPS until an operator supplies a **verified** route corridor. Inferred OSRM paths cannot be used to authorize GPS.

A successful `/api/config` response with `serverConfigured: true` only indicates environment variables are present; it does **not** prove Auth, RLS, Realtime or GPS work. See [real GPS](docs/REAL_GPS.md), [security](docs/SECURITY.md) and [deployment](docs/DEPLOYMENT.md).

## Architecture

- Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide and reusable UI primitives.
- [Motion](https://motion.dev) (`motion`, loaded lazily with `LazyMotion`) powers the animation and gesture layer: staggered hero entrance, the route-timeline draw, animated ETA digits and alert counts, page entrances, swipeable/expandable route cards, swipe-to-dismiss bottom sheets, the drag-to-expand Track sheet, swipe actions on notifications and pull-to-refresh on routes. Every gesture has a button or keyboard equivalent, `prefers-reduced-motion` is honoured, and no animation substitutes for real tracking data. Conventions live in [DESIGN.md](DESIGN.md#motion--gestures-november-2026).
- Frosted glass is reserved for chrome: sticky headers, the mobile bottom navigation, bottom sheets, the Track drag sheet, map chips and the sign-in card. It degrades to near-opaque white without `backdrop-filter`, becomes fully opaque under `prefers-reduced-transparency`, and never carries page content. Rules are in [DESIGN.md](DESIGN.md#frosted-glass-november-2026).
- Leaflet/OpenStreetMap raster tiles; responsive schematic fallback when tiles fail. `/api/road-route` calls the public OSRM demo server for a fixed catalogue route only, caches valid responses, and falls back when it cannot route. Public OSRM and OSM tiles have no production SLA; use suitable providers for production traffic.
- `data/lords-routes-2025-26.json` is the persistent source transcription; `data/routes.ts` creates domain routes and simulation-only vehicles.
- `lib/geo.ts`, `lib/eta.ts`, `lib/simulation.ts`, and `lib/road-routing.ts` implement geometry, estimates and movement. Simulated movement uses the same geometry shown on the map.
- `state/app-provider.tsx` handles the selected route, the Supabase session, sign-in/sign-out (including Google), backend data and Realtime. Server API handlers validate roles and keep privileged credentials server-side.
- `components/require-auth.tsx` is the app shell's access gate; it redirects to `/login` and remembers the attempted page so the student returns there after signing in.
- `supabase/migrations/` contains tables, RLS, secure trip actions and the historical-route migration. `scripts/generate_seed.py` regenerates the insert-only seed from the JSON catalogue.
- Type is [Overpass](https://github.com/RedHatOfficial/Overpass) (SIL OFL 1.1), self-hosted from `app/fonts/` via `next/font/local`; `scripts/fonts/patch-overpass.py` regenerates the file from the Fontsource package with its GDEF mark-class fix. `scripts/browser/` holds the sandbox design checks: `setup.sh` installs a headless Chromium and the [Impeccable](https://impeccable.style) detector under `.cache/`, `impeccable-scan.cjs` scans rendered pages (public and signed-in) and `screenshot.cjs` captures them; results and the rules they enforce are in [DESIGN.md](DESIGN.md#skills-review-november-2026).
- `tests/` (137 tests) covers route data, unknown stops, maps and routing fallback, simulation, UI flows, authentication, GPS validation, gesture maths and motion components, and SQL migrations using a local PostgreSQL-compatible test database.

## Security and limitations

- Supabase service-role secrets stay server-side; the role stored in the browser cannot authorize a server action. The API validates the user's token, role, assignment, active trip and sharing state, location age, Hyderabad bounds, and distance from a **verified** route corridor. GPS writes recheck mutable state under database row locks; direct client GPS inserts and the older, weaker GPS RPC are revoked.
- Real GPS, hosted RLS/Realtime, mobile Safari/Chrome rendering, and driver-device operation have **not** been end-to-end verified in this environment. The rate limiter is in-memory, not suitable for multi-instance production. A privacy review, retention policy, monitoring and a security review are needed before collecting real locations.
- Browser notifications require permission; SMS, WhatsApp and push providers are not configured. The map requires network access for tiles and road routing; the schematic/straight-line fallbacks remain available.
- This is a prototype, not an official service or navigation tool. Do not use its estimates to make transport or safety decisions.

See [the BusTrack design system](DESIGN.md) for measured UI tokens and responsive rules, plus [testing](docs/TESTING.md) and [verification](docs/VERIFICATION.md) for what was actually checked.
