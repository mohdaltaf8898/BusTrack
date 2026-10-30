# Deployment guide — Vercel

> Do not deploy publicly, collect real GPS, or enable paid services without institutional authorization. The default deployment below is a credential-free simulation prototype.

## 1. Pre-deployment checks

Run locally:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run check
```

All checks must pass. Confirm:

- `README.md` and this docs folder are committed.
- `.env.local` is not committed.
- No service role key appears in any `NEXT_PUBLIC_*` variable.
- The 2025–26 timetable is clearly identified as historical; approximate map locations and placeholder contacts are acceptable for the demo.
- OSM tile usage policy is acceptable for expected traffic.

## 2. Push and import

1. Commit the work on the working branch.
2. Push to GitHub:

   ```bash
   git push origin <your-branch>
   ```

3. In Vercel, choose **Add New → Project** and import the repository.
4. Framework preset: **Next.js**.
5. Build command: `npm run build`.
6. Install command: `npm ci`.
7. Node.js version: **22.x or 24.x**.
8. Output: Next.js default (no static export).

The API routes require the Node.js runtime; do not switch to a static `output: export` build.

## 3. Environment variables

### Demo-only deployment

Leave all Supabase variables unset. Optionally set:

```dotenv
NEXT_PUBLIC_SITE_URL=https://YOUR_VERCEL_DOMAIN
NEXT_PUBLIC_SIMULATION_SPEED_MULTIPLIER=8
NEXT_PUBLIC_STALE_LOCATION_SECONDS=45
```

The `/api/config` endpoint will report `demoMode: true`.

### Optional configured backend

Add these in Vercel Project Settings → Environment Variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=https://YOUR_VERCEL_DOMAIN
```

Set the same values for Production and Preview environments as needed. Keep `SUPABASE_SERVICE_ROLE_KEY` out of any client bundle and out of GitHub.

## 4. Supabase configuration for the deployed domain

1. Apply `supabase/migrations/20261030135413_bustrack_init.sql`, then `supabase/migrations/20261030135426_bustrack_published_routes.sql`, then `supabase/migrations/20261030140136_bustrack_function_grants.sql`.
2. Apply `supabase/seed.sql`. These are already applied to the hosted BusTrack project; use this sequence for a separate project.
3. Add the Vercel domain to **Authentication → URL Configuration**:
   - Site URL: `https://YOUR_VERCEL_DOMAIN`
   - Redirect URLs: `https://YOUR_VERCEL_DOMAIN/**`
4. Confirm Realtime publication includes `bus_locations` and `notifications`.
5. Confirm Auth users and `profiles.role` assignments exist.
6. Replace `SIM-*` vehicles, verify routes/stop coordinates, provision a verified corridor, and set `buses.driver_id` for each assigned driver before real tracking.
7. Test sign-in at `/login`.

## 5. HTTPS and GPS

Browser Geolocation requires a secure context. Vercel provides HTTPS by default. Local development uses `localhost`, which is also a secure context. Real GPS will not work on an insecure HTTP origin.

## 6. Post-deploy smoke test

1. Open `/api/config` and verify the expected `demoMode` value.
2. Open `/` and confirm the **DEMO MODE** badge, greeting, ETA, map, and bottom/mobile or sidebar/desktop navigation.
3. Open `/track`, select Route 01, and verify the bus marker starts at the first stop and moves along the route.
4. Trigger a test delay and confirm ETA increases and a simulated delay alert appears.
5. Toggle offline and confirm the warning and last-known position.
6. Open `/driver`, start/end a demo trip, and toggle share.
7. Open `/admin`, add/edit/delete a demo item, then refresh to confirm persistence.
8. Open `/login` and switch demo roles; confirm driver/admin route guards.
9. If Supabase is configured, sign in as an assigned driver and verify server-authorized start/share; test stale/off-route rejection.
10. Test on iPhone Safari and Android Chrome at 375px and 430px widths; check no horizontal scrolling.

For the existing `bustrack` project, Git auto-deployments are disabled; pushing a branch alone does not update production. An authorized operator must explicitly deploy the desired commit and confirm the production alias.

## 7. Rollback

- Vercel: use **Deployments → previous healthy deployment → Promote to Production**.
- Supabase schema: keep a database backup before applying new migrations; roll forward with a corrected migration rather than dropping tables with live data.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if a deployment accidentally exposed it.

## 8. Cost and operational cautions

- Supabase free tier and Vercel hobby tier limits may apply; this project does not require paid services for the demo.
- Realtime and frequent GPS polling consume resources; tune intervals before a pilot.
- OSM public tile servers and the public OSRM demo router have no production SLA. Use appropriate providers for production volume; the app falls back to a schematic/straight-line map when they fail.
- No push/SMS/WhatsApp provider is configured; adding one is a separate project with its own secrets and costs.
