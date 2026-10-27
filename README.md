# BusTrack — Smart College Bus Tracking System

**Lords Institute of Engineering and Technology, Hyderabad · “Know Before You Go”**

BusTrack is a mobile-first, functional Next.js prototype for campus bus tracking. It is **not a landing page** and **not an official college transport system**. All sample routes, contacts, bus numbers, schedules, and timings are fictional/illustrative. Hyderabad-area coordinates are approximate and must not be used for navigation.

> **Design-thinking prototype:** the default build runs entirely without credentials, Supabase, an API key, or device GPS. Every displayed bus position and timing is clearly labelled **simulated** and a persistent **DEMO MODE** badge is shown. Real GPS is an optional, server-authorized integration that is **not configured or claimed operational** in this repository.

---

## Contents

- [What is included](#what-is-included)
- [Quick start — credential-free demo](#quick-start--credential-free-demo)
- [Technology stack](#technology-stack)
- [Application pages](#application-pages)
- [Core behavior](#core-behavior)
- [Architecture](#architecture)
- [Optional Supabase backend](#optional-supabase-backend)
- [API and database schema](#api-and-database-schema)
- [Simulation vs real GPS](#simulation-vs-real-gps)
- [Security model](#security-model)
- [Testing](#testing)
- [Verification report](#verification-report)
- [Deployment](#deployment)
- [Known limits](#known-limits)
- [Future improvements](#future-improvements)
- [Repository map](#repository-map)

---

## What is included

- Eight application routes:
  - `/` Student Dashboard
  - `/track` Live Bus Tracking
  - `/routes` Routes and Stops
  - `/notifications` Notification Center
  - `/bus-details` Bus Details
  - `/driver` Driver Dashboard
  - `/admin` Admin Dashboard
  - `/login` Login and `/profile` Profile
- Three centrally defined Hyderabad-area sample routes with ordered stops, IDs, names, bus numbers, origin/destination, duration, operating status, colors, speeds, and polyline geometry.
- A deterministic simulation engine constrained to each route polyline. Buses never jump to random coordinates.
- Pause/resume/reset/offline states, last update, one-second UI tick, configurable speed multiplier, traffic slowdowns, automatic/manual delay events, trip start/end events, and stale-data warnings.
- ETA based on remaining polyline distance and average route speed, with nonnegative values, per-stop estimates, traffic/delay adjustments, and status labels.
- Interactive Leaflet/OpenStreetMap map with route polyline, bus marker and heading, stop markers, selected stop, college marker, zoom controls, center-on-bus, resize handling, and a schematic fallback when tiles are unavailable.
- A notification center covering delay, approaching, arrived, trip started, trip completed, and location unavailable; unread/read state, timestamps, deduplication, test-delay control, deletion, and simulated labels.
- Searchable/filterable admin tables with validated add/edit/delete dialogs, confirmations, empty/error states, and localStorage demo fallback.
- Optional Supabase Auth/Postgres/Realtime design with a migration, RLS policies, secure RPCs, seed data, server-only API routes, stale/coordinate/route validation, and last-known-position handling.
- PWA manifest/icon and install guidance. Browser notification permission is optional; SMS/WhatsApp/push providers are not implemented.

---

## Quick start — credential-free demo

### Requirements

- Node.js 20.9+ (tested with Node 22)
- npm 10+
- A modern browser (Chrome, Safari, Edge, Firefox)

### Run locally

```bash
git clone <your-repository-url>
cd BusTrack
npm ci
npm run dev
```

Open `http://localhost:3000`.

**Do not create `.env.local` for the demo.** Leaving the Supabase variables unset is intentional: the app boots with local sample data, local demo roles, a localStorage-backed admin/driver state, and the full simulation engine.

### Production build

```bash
npm run check    # typecheck + unit tests + production build
npm run start    # serves the production build on 0.0.0.0:3000
```

Other useful commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:watch
npm run build
```

---

## Technology stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 App Router, React 19, TypeScript 5 |
| Styling | Tailwind CSS 3, custom shadcn-style UI primitives, Lucide icons |
| Map | Leaflet 1.9 + OpenStreetMap raster tiles, imperative client-side integration |
| Data | Central TypeScript sample data in `data/routes.ts`; optional Supabase Postgres |
| Auth/Realtime | Optional `@supabase/supabase-js` Auth, Realtime, and RLS |
| Validation | Zod schemas for API/admin/location inputs |
| Tests | Vitest, jsdom, React Testing Library |
| Storage | Demo state in `localStorage`; no secrets stored in browser storage |

No `react-leaflet` wrapper is used; the map is dynamically imported on the client to avoid server-side `window` access. The app uses a small custom component set rather than adding the shadcn CLI at runtime.

---

## Application pages

### Student

- **Dashboard:** greeting/profile, selected route, prominent ETA, bus status card, distance, last update, upcoming stops, quick actions, notifications, and demo controls.
- **Live tracking:** full-screen-route map, route selector, selected stop, bus marker/heading, stop ETAs, map controls, status, last update, and simulation/offline warnings.
- **Routes and stops:** all routes, operating status, bus number, origin/destination, duration, speed, ordered stop list, route preview, and route selection.
- **Notifications:** unread badge, mark read/all read, delete/clear, type filters, timestamps, simulated labels, and a test-delay control.
- **Bus details:** bus number, assigned route, trip status, last reported location, capacity/model, service availability, authorized driver contact, and transport-office contact using placeholders.

### Driver

- Local demo Start/End Trip, pause/resume/reset, Share Location toggle, assigned bus/route, current location/last update/connection status.
- Demo Start Trip starts the simulated movement on the assigned route; no student page ever requests driver GPS.
- Optional real-GPS path is separate and only starts `navigator.geolocation.watchPosition()` **after** a server-authorized active trip ID and successful share action.

### Admin

- Overview plus tabs for buses, routes, stops, driver assignments, trips, delays, and location-update health.
- Search/filter tables, validated add/edit dialogs for buses/routes/stops/assignments/delay reports, delete confirmations, empty/error states, and local demo fallback.
- Backend refresh when configured; local demo edits persist in localStorage.

### Login/profile

- Supabase email/password sign-in only when the public environment variables are configured.
- Clearly labelled local demo role buttons for student/driver/admin when credentials are absent.
- Profile shows account/backend/role state, browser notification permission, PWA install guidance, privacy state, and local demo reset.

> Demo role switching is a client-side prototype affordance, not a security boundary. Real authorization comes from the Supabase Auth token and server-side `profiles.role` lookup.

---

## Core behavior

### Simulation

- Default simulation speed is `8x`, configurable with `NEXT_PUBLIC_SIMULATION_SPEED_MULTIPLIER`.
- A stale location warning appears after `45s`, configurable with `NEXT_PUBLIC_STALE_LOCATION_SECONDS`.
- Movement is computed from elapsed time, route average speed, and a deterministic traffic factor.
- Position is always derived from cumulative polyline distance using `positionAtDistance()`; markers are never randomized.
- Manual test delay is `5 min`; deterministic congestion events add `90s`/`120s` at route progress thresholds.
- Pause, resume, reset, offline, trip start, trip end, and share toggles are available in the demo engine.
- Every generated position, notification, and timing is labelled simulated.

### ETA and status

- `ETA = remaining polyline distance / (averageSpeedKmh × trafficFactor) + nonnegative delay`.
- ETAs are computed separately for every upcoming stop; departed stops show `0 min`.
- Statuses include **On Time**, **Delayed**, **Arriving**, and **Offline**.
- Arriving is triggered at `≤60s` or `≤140m`; approaching at `≤240s`.
- **Important:** straight-line/polyline distance is **not road distance**, and ETAs are **estimates only**. Road geometry turns, signals, dwell time, and real traffic are not modeled.

### Map

- OSM/Leaflet with route polyline, stops, selected stop, college marker, bus marker, direction arrow, zoom controls, center-on-bus, popup labels, and resize observer.
- If OSM tiles cannot load (for example, offline), the app keeps the Leaflet container mounted and shows a schematic route fallback with a retry button.
- The map uses `L.Map.invalidateSize()` after container size changes so the route/marker stay synchronized.

---

## Architecture

```text
app/                     Next.js App Router pages and server API routes
  api/config/            Credential-free capability probe
  api/locations/         Authorized GPS ingestion/read
  api/trips/             Start/end/share trip actions
  api/admin/             Backend data read and admin mutations
components/              Reusable UI, dashboard widgets, driver/admin workspaces
  maps/                  Dynamic Leaflet implementation and schematic fallback
  ui/                    Buttons, cards, badges, forms, dialogs, tabs, feedback
data/routes.ts           Central sample routes, buses, stops, drivers, contacts
lib/                     Types, geo, ETA, simulation, validation, selectors, reducer
  server/                Server-only auth, rate limit, location validation
state/app-provider.tsx   Client context, ticking, persistence, realtime, actions
supabase/                SQL migration (tables, RLS, RPCs) and sample seed
tests/                   Vitest unit/component/API tests
```

Separation of concerns:

- `data/` holds sample data only.
- `lib/` holds pure domain logic, validation, and mapping.
- `components/` holds reusable presentation/UI.
- `state/` coordinates demo state, browser APIs, and optional backend integration.
- `app/api/` holds the only server-side privileged operations.

---

## Optional Supabase backend

The application is intentionally complete without Supabase. To enable the optional backend:

1. Create a Supabase project.
2. In **Project Settings → API**, copy the project URL and anon/public key.
3. In **SQL editor**, run `supabase/migrations/20261027000000_init.sql`.
4. Run `supabase/seed.sql` to insert the three sample routes and buses.
5. In **Database → Publications**, confirm `supabase_realtime` includes `bus_locations` and `notifications` (the migration attempts this safely).
6. Create users in **Authentication → Users**, then promote them in SQL:

   ```sql
   update public.profiles set role = 'admin'  where id = '<ADMIN_AUTH_USER_UUID>';
   update public.profiles set role = 'driver' where id = '<DRIVER_AUTH_USER_UUID>';
   update public.buses set driver_id = '<DRIVER_AUTH_USER_UUID>' where id = 'bus-bt01';
   ```

7. Copy `.env.example` to `.env.local` and set:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
   ```

8. Restart `npm run dev`.

**Never** prefix the service role key with `NEXT_PUBLIC_`. Never commit `.env.local`. The service role key is read only in `app/api/*` route handlers via `lib/server/auth.ts`.

See [`docs/SETUP.md`](docs/SETUP.md) for a detailed backend checklist and [`docs/REAL_GPS.md`](docs/REAL_GPS.md) for the GPS authorization sequence.

---

## API and database schema

### Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/config` | Reports whether public/server credentials are configured; never returns secrets. |
| `GET` | `/api/admin` | Reads routes, stops, buses, trips, delays, and health. Driver profiles are included only for admins. |
| `POST` | `/api/admin` | Validated admin create/update/delete operations. Requires admin role. |
| `GET` | `/api/locations?busId=...` | Reads the last authorized trip location for an authenticated user. |
| `POST` | `/api/locations` | Validated GPS ingestion. Requires driver/admin role, active trip, sharing ON, assignment, fresh timestamp, and route corridor. |
| `GET` | `/api/trips` | Lists recent trips for driver/admin. |
| `POST` | `/api/trips` | Starts/ends a trip or sets sharing. Requires driver/admin role and assignment. |

### Tables

- `profiles`: `id`, `name`, `role`, created/updated timestamps.
- `routes`: `id`, `code`, `route_name`, `start_location`, `destination`, `bus_number`, `description`, `average_speed_kmh`, `estimated_duration_minutes`, `status`, `color`, `shape`, `stop_indices`.
- `buses`: `id`, `bus_number`, `assigned_route_id`, `driver_id`, `capacity`, `status`, `model`, `service_availability`.
- `stops`: `id`, `route_id`, `stop_name`, `latitude`, `longitude`, `stop_order`.
- `trips`: `id`, `bus_id`, `route_id`, `driver_id`, `status`, `sharing_enabled`, `started_at`, `ended_at`, `last_location_at`, `created_by`.
- `bus_locations`: `id`, `bus_id`, `route_id`, `trip_id`, `latitude`, `longitude`, `heading`, `speed_kmh`, `accuracy_meters`, `source`, `status`, `recorded_at`, `created_at`.
- `notifications`, `notification_reads`, `delay_reports`, and the `bus_location_health` view.

Indexes include `(bus_id, recorded_at desc)`, `(trip_id, recorded_at desc)`, `(route_id, stop_order)`, and a partial unique index permitting only one active trip per bus.

---

## Simulation vs real GPS

| | Simulation mode | Optional real GPS |
| --- | --- | --- |
| Credentials | None | Supabase URL/anon key + server service role key |
| Browser permission | None | Driver must grant Geolocation on HTTPS |
| Source of position | Polyline interpolation | `navigator.geolocation.watchPosition()` |
| Authorization | Local demo role only | Supabase Auth token, driver/admin role, assigned bus, active trip, sharing ON |
| Dashboard updates | One-second local tick | Supabase Realtime inserts + 5s polling fallback |
| Label | **DEMO MODE**, “Simulated” | “Live GPS” only for fresh, authorized positions |
| Status in this repo | Fully working and tested | Implemented but **unconfigured and not device-tested** |

The driver workspace does **not** imply that a student opening the site has access to a driver’s device GPS. Student pages only read authorized trip locations from the server/Realtime; they never call `navigator.geolocation` for driver tracking.

---

## Security model

- Server-side API routes validate the Supabase Auth access token and the caller’s `profiles.role` on every privileged request.
- RLS is enabled on all tables; direct client writes to `trips` and `bus_locations` are revoked.
- Drivers can submit GPS only for their assigned bus, an active trip with sharing enabled, a fresh timestamp, and coordinates inside the configured route corridor.
- Students cannot write GPS, trips, buses, routes, stops, or delay reports.
- Admin mutations are whitelisted by resource/action and validated with Zod before any database operation.
- Off-duty/private driver locations are not exposed: reads are limited to active trips and last-known bus locations from trips completed within 15 minutes.
- Secrets are environment-only; safe error responses avoid leaking stack traces or credentials.
- A small in-memory rate limiter protects API routes; production should use a distributed limiter.
- Browser notification permission and PWA install are optional; no SMS/WhatsApp/push provider is configured.

See [`docs/SECURITY.md`](docs/SECURITY.md) for RLS details, threat model, and production hardening.

---

## Testing

Automated tests cover **31 tests across 6 files**:

- Three sample routes with ordered stops and polyline-aligned stop indices.
- Correct starting marker for Route A, movement on the polyline, and direction/bearing.
- ETA reduction as distance decreases, nonnegative ETAs, delay increasing ETA, and offline status.
- Route switching without refresh, upcoming-stop recalculation, and stale warnings.
- Notification deduplication, read state, delay reports, trip start/end, and admin CRUD validation.
- GPS payload/coordinate/staleness/off-route validation.
- Anonymous and student-role rejection for privileged actions.
- Credential-free demo configuration and mobile/desktop navigation classes.
- Real UI interactions for student route switching/delay/offline, driver trip start/end, demo login roles, and admin bus creation.

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run check
```

See [`docs/TESTING.md`](docs/TESTING.md) for the manual browser test checklist and [`docs/VERIFICATION.md`](docs/VERIFICATION.md) for the exact verification report.

---

## Verification report

On this branch, `npm run check` completed successfully and `npm run lint` was clean: TypeScript, 31 automated tests, and the production Next.js build all passed. A production server returned `200 OK` for all nine application pages and the PWA assets; `/api/config` reported `demoMode: true`, an anonymous GPS POST was rejected with `401`, and admin backend reads returned a safe `503 DEMO_MODE`. See [`docs/VERIFICATION.md`](docs/VERIFICATION.md) for the full report and the list of integrations that require external credentials/devices.

---

## Deployment

The app is a standard Next.js 15 application and can be deployed to Vercel:

1. Push this branch to GitHub.
2. Import the repository in Vercel.
3. Build command: `npm run build`; output: Next.js default; Node.js 22.
4. Add environment variables in Vercel Project Settings (or leave them unset for demo mode).
5. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS URL.
6. Add the deployment domain to Supabase Auth redirect URLs when using real Auth.
7. Deploy. Do **not** add paid services or public GPS collection without institutional authorization.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full Vercel checklist and rollout/rollback notes.

---

## Known limits

- Sample geometry is approximate; straight-line polyline distance is not road distance.
- ETAs are estimates and do not use live traffic, dwell time, road snapping, or turn-by-turn routing.
- OSM tiles require network access; the schematic fallback is intentionally simplified.
- Real GPS, Supabase Realtime, Supabase Auth, and server admin mutations are implemented but **not configured or end-to-end tested with credentials/devices in this repository**.
- SMS/WhatsApp notifications are not implemented. Browser notifications are optional and require explicit user permission.
- The in-memory rate limiter and localStorage demo persistence are suitable for prototypes, not multi-instance production.
- Admin route geometry rebuilds a stop-to-stop polyline after stop edits; detailed via-points from the template are simplified.
- Placeholder contacts and fictional bus/driver data must be replaced before any real deployment.
- No offline service worker caching beyond the PWA manifest is implemented.

---

## Future improvements

- Import verified college route shapes and scheduled timetables.
- Road-snapped routing via OSRM/GraphHopper/Mapbox Directions and dwell-time-aware ETA.
- Institutional SSO and audited role management.
- Distributed rate limiting, structured audit logs, anomaly detection, and coordinate jump checks.
- Device-side GPS buffering with retry/backoff and battery-aware sampling.
- Push notifications through a configured provider (Web Push/VAPID or FCM).
- Driver shift scheduling, attendance, incident reports, and transport-office analytics.
- Accessibility audit, E2E browser tests, and real-device Safari/Chrome testing.
- Multi-language support and low-bandwidth map strategy.

---

## Repository map

```text
README.md                         This file
.env.example                      Environment template (no secrets)
data/routes.ts                    Central sample routes/buses/stops/drivers/contacts
lib/                              Domain logic, validation, selectors, reducer, server helpers
state/app-provider.tsx            Client state, persistence, demo engine, realtime/API actions
app/                              Pages, layout, global styles, API route handlers
components/                       Reusable UI, maps, dashboard/driver/admin workspaces
public/                           PWA manifest and inline SVG icon
supabase/migrations/              Tables, constraints, indexes, RLS, secure RPCs
supabase/seed.sql                 Sample routes/stops/buses, no personal data
docs/                             Setup, security, deployment, real GPS, testing
tests/                            Automated Vitest/RTL tests
```

---

**Reminder:** This repository is a design-thinking prototype. Do not represent simulated positions, estimates, placeholder contacts, or unconfigured integrations as operational college transport data.
