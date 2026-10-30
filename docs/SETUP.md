# Setup guide

## Credential-free demo

Install Node 22 (or supported Node 20.9+/24), then run `npm ci` and `npm run dev`. Open `http://localhost:3000`. No `.env.local` or Supabase account is needed. The 16 stop lists/times are from the historical 2025–26 document; vehicles, positions, ETAs and alerts are simulated. Reset via Profile or remove the `bustrack:demo-state:v2` localStorage key.

## Optional Supabase project

The hosted BusTrack project has been provisioned with the schema and seed; the local checkout has no credentials. Only configure an authorized project; creating projects and enabling services may have account/tier limits or costs. Student sign-up can be enabled in Supabase Auth, but confirmation and reset email delivery to non-team addresses requires custom SMTP. Connecting the database does not verify routes, start a driver's GPS, or enable SMS/WhatsApp.

### 1. Create project and apply SQL

1. Create a project in the Supabase dashboard and wait for it to finish provisioning.
2. Open **SQL Editor**, paste and run the complete contents of these repository files, in this order:
   - `supabase/migrations/20261030135413_bustrack_init.sql`
   - `supabase/migrations/20261030135426_bustrack_published_routes.sql`
   - `supabase/migrations/20261030140136_bustrack_function_grants.sql`
   - `supabase/migrations/20261030144351_bustrack_guarded_gps.sql`
   - `supabase/seed.sql`
3. The seed adds 16 historical routes and placeholder `SIM-*` buses without overwriting matching rows. It contains no real driver identities or contacts. An older installation may still contain old demo routes; review and remove/migrate them deliberately after backing up, rather than deleting real records automatically.
4. Check **Database → Publications → supabase_realtime** includes `bus_locations` and `notifications`. The initial migration tries to add them. If a table is absent, add only the missing table in the dashboard or SQL editor.

The migrations create the schema, RLS policies, trip functions, nullable stop positions, historical time fields and the verified-route gate. The legacy `submit_bus_location` RPC is revoked from browser roles; the driver client uses the validated server API instead. The seed can be regenerated with `python3 scripts/generate_seed.py` after editing the source JSON.

### 2. Create accounts and assign roles

1. For public student registration, turn on **Authentication → Providers → Email** and allow sign-ups while retaining **Confirm email**. Configure custom SMTP under **Authentication → SMTP** first: the default Supabase sender delivers only to project-team addresses (currently 2 emails/hour), so it cannot reliably confirm student addresses or send password resets. Add the deployed `https://bustrack-eight.vercel.app/login` and `https://bustrack-eight.vercel.app/auth/set-password` to **Authentication → URL Configuration** redirect allowlist, or your own site equivalents. Students use **Login → Sign up**; new profiles default to `student` regardless of client-provided metadata. For staff, create users in **Authentication → Users**, or invite them after SMTP and the password-setting screen have been deployed. Dashboard-created users with passwords can sign in directly; check confirmation status. Neither route elevates a role on its own. The `handle_new_user` trigger creates their `public.profiles` rows as students.
2. In the trusted project SQL editor (database owner), use the UUIDs shown in Auth to promote the first admin and intended drivers. Replace the angle-bracket values locally; they are not real IDs:

   ```sql
   update public.profiles set role = 'admin' where id = '<ADMIN_AUTH_USER_UUID>';
   update public.profiles set role = 'driver' where id = '<DRIVER_AUTH_USER_UUID>';
   ```

   The trigger allows trusted database-owner bootstrap and blocks a normal student from promoting themself. Later role changes should be restricted to authorized admins. Confirm the updates affect the expected rows. The hosted project already has an authorized admin and driver; do not recreate or re-promote them without checking the existing rows. Do not share passwords in chat.
3. Replace the `SIM-*` placeholder vehicle details with approved real records. Assign one authorized driver to the intended bus (replace both values):

   ```sql
   update public.buses set driver_id = '<DRIVER_AUTH_USER_UUID>'
   where id = '<BUS_ID>';
   ```

   The driver's profile must already have the `driver` role. Confirm `assigned_route_id` matches the route, and test each assignment. Do not import old phone numbers as current contact details.

### 3. Configure local environment securely

In Supabase **Project Settings → API / API Keys**, obtain the project URL, public anon key and server-side service-role key. Copy `.env.example` to `.env.local` and fill in:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The first two values are public and rely on RLS. The service-role key bypasses RLS and must be kept **server-side only**; never use `NEXT_PUBLIC_` for it, commit it, share it in chat or put it in a browser. Restart the server after changing variables. `/api/config` can confirm that variables are present, not that integrations are operational.

For Vercel, add these values to the correct environment in Project Settings → Environment Variables and redeploy. In Supabase **Authentication → URL Configuration**, set the deployed HTTPS site URL and approved redirect URLs for `/login` and `/auth/set-password`. Signup confirmation returns to `/login`; reset links and dashboard invitations open the password-setting screen. Supabase's email sender restrictions still apply until you configure your own SMTP. Do not reuse production secrets in untrusted preview environments.

### 4. Verify actual routes before GPS

The seed's approximate points and best-effort OSRM path are for the demo only. Real location writes return `409 ROUTE_NOT_VERIFIED` until transport staff have:

1. Confirmed current route order, timetable and actual pickup coordinates, including previously unmapped stops.
2. Supplied and reviewed the actual ordered route corridor, preferably an approved trace or surveyed route. The API accepts GPS only within 800 m of the stored corridor.
3. Updated each stop's `latitude`/`longitude` (both present or both null), `scheduled_time` and source fields as appropriate. Coordinate/order changes invalidate verification automatically. Admin stop edits rebuild a straight line and also invalidate it.
4. Stored the verified ordered `routes.shape` JSON array (`[{"lat":...,"lng":...}, ...]`) and the corresponding `stop_indices` array (one shape index per ordered stop, `-1` only for unmapped stops). After reviewing those values, a trusted operator can set that route's `geometry_source = 'verified'` in the same controlled SQL workflow. Set it **after** stop edits; do not mark an OSRM estimate or a straight-line seed as verified.
5. Replaced simulation vehicles and assigned the correct drivers, then tested each authorized trip and reviewed GPS accuracy on a real device.

There is currently no trace-import UI; the route shape must be provisioned by a trusted operator. Use a private test project, back up data, and have the college validate the corridor before enabling actual tracking.

### 5. Verify the integration

- Sign in as the admin, driver and student accounts and confirm role boundaries. A demo role is not an Auth account.
- On HTTPS, an assigned driver starts a server-authorized trip, enables sharing and explicitly grants device location permission. A student opening the site never starts the driver's GPS.
- Verify database rows and a second signed-in student's view, and test sharing-off/end-trip, stale/off-route rejection and Realtime/polling. Live GPS is **not** proven merely by the config endpoint.
- ETAs still use simulated traffic even with GPS, so **DEMO MODE** remains visible. Review [REAL_GPS.md](REAL_GPS.md), [SECURITY.md](SECURITY.md), and the manual checklist in [TESTING.md](TESTING.md).

| Symptom | What to check |
| --- | --- |
| `503 DEMO_MODE` | URL, anon key and server-only service key are all present; restart/redeploy. |
| Cannot promote first admin | Run the update in the trusted database-owner SQL editor after all four migrations; verify Auth user/profile exists. |
| Driver cannot start a trip | Driver role, bus assignment, route and vehicle status. |
| `409 ROUTE_NOT_VERIFIED` | Staff must supply and review a real corridor; never mark an estimate verified just to bypass the gate. |
| `422` GPS rejection | Timestamp may be stale or the coordinate outside Hyderabad/800 m corridor; check device and verified trace. |
| Missing live updates | Check sign-in, driver sharing, Realtime publication/RLS, network and polling. |
| Road line is straight or tiles missing | OSRM/OSM may be unavailable; the labelled fallback is intentional. |
