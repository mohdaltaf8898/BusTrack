# Setup guide

## 1. Credential-free demo (recommended first)

1. Install Node.js 20.9+ and npm 10+.
2. Run:

   ```bash
   npm ci
   npm run dev
   ```

3. Open `http://localhost:3000`.

No `.env.local` is required. The app reads `data/routes.ts`, initializes three simulated routes, and stores demo role/admin/driver state in `localStorage`. All generated locations and timings are labelled simulated.

To reset the demo, open **Profile → Local demo reset**, or clear this browser key:

```text
bustrack.state.v1
```

## 2. Optional Supabase project

Only follow this section if you have an authorized Supabase project. The prototype remains fully functional without it.

### 2.1 Create the project

1. Create a project at Supabase.
2. Open **Project Settings → API**.
3. Copy:
   - Project URL
   - `anon` / `public` key
   - `service_role` key (keep server-only)

### 2.2 Apply SQL

Run these files in the Supabase SQL editor in order:

1. `supabase/migrations/20261027000000_init.sql`
2. `supabase/seed.sql`

Or use the Supabase CLI from the repository root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migration creates tables, constraints, indexes, triggers, RLS policies, secure RPCs, and the `bus_location_health` view. It also attempts to add `bus_locations` and `notifications` to the `supabase_realtime` publication.

### 2.3 Create Auth users and roles

1. In Supabase **Authentication → Users**, create an admin user and at least one driver user.
2. The `handle_new_user` trigger creates a `profiles` row with the default `student` role.
3. Promote the users in SQL:

   ```sql
   update public.profiles set role = 'admin'
   where id = '<ADMIN_AUTH_USER_UUID>';

   update public.profiles set role = 'driver'
   where id = '<DRIVER_AUTH_USER_UUID>';

   update public.buses
   set driver_id = '<DRIVER_AUTH_USER_UUID>'
   where id = 'bus-bt01';
   ```

4. Repeat bus assignment for other drivers as needed. A bus must have a driver profile before a real trip can start.

### 2.4 Enable Realtime

Check **Database → Publications → supabase_realtime**. If the tables are not listed, run:

```sql
alter publication supabase_realtime add table public.bus_locations;
alter publication supabase_realtime add table public.notifications;
```

The client also polls `/api/locations` every five seconds for the selected bus, so a missed Realtime event should recover on the next poll.

### 2.5 Configure environment

```bash
cp .env.example .env.local
```

Fill only these values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Optional demo tuning:

```dotenv
NEXT_PUBLIC_SIMULATION_SPEED_MULTIPLIER=8
NEXT_PUBLIC_STALE_LOCATION_SECONDS=45
```

Restart the dev server after changing environment variables. Next.js only inlines `NEXT_PUBLIC_*` variables at build/start time.

### 2.6 Verify

```bash
curl http://localhost:3000/api/config
```

Expected when fully configured:

```json
{
  "publicConfigured": true,
  "serverConfigured": true,
  "demoMode": false
}
```

Expected in demo mode:

```json
{
  "publicConfigured": false,
  "serverConfigured": false,
  "demoMode": true
}
```

Then sign in at `/login` with the admin user. The `/admin` page should show the backend data. Refresh backend data from the admin workspace if routes were added after the page loaded.

## 3. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/api/config` says `demoMode: true` | Missing service role key or public variables | Set all three Supabase variables and restart. |
| Login form appears but API returns 503 | Public Auth is configured, server role key is not | Set `SUPABASE_SERVICE_ROLE_KEY` server-side only. |
| Admin page says no routes | Seed not applied or RLS blocks read | Run `supabase/seed.sql`; check policies. |
| Driver cannot start real trip | No driver profile, no bus assignment, or wrong route | Apply role/assignment SQL; verify bus route. |
| GPS writes return 403 | Student role or unassigned driver | Use an assigned driver/admin Auth account. |
| GPS writes return 422 | Stale timestamp or coordinates off route | Use current device time and verify route geometry. |
| Realtime does not update | Tables missing from publication or RLS | Add publication tables; confirm authenticated session. |
| Map tiles do not load | Network/blocked OSM tiles | Use the built-in schematic fallback or retry tiles. |
| Stale demo state after code change | localStorage persisted old shapes | Use Profile → Local demo reset. |

## 4. Safety notes

- Do not commit `.env.local` or a service role key.
- Do not expose the service role key through `NEXT_PUBLIC_*`.
- Do not use real student/driver personal data in this prototype.
- Do not claim real GPS, SMS, WhatsApp, or push delivery is operational unless the provider is configured and tested.
- Do not deploy publicly or enable paid services without institutional authorization.
