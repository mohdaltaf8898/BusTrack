# Optional Supabase schema

Apply in this order using the trusted SQL editor:

1. `migrations/20261030135413_bustrack_init.sql` — tables, constraints, indexes, RLS, trip functions and Realtime publication.
2. `migrations/20261030135426_bustrack_published_routes.sql` — nullable stop coordinates, timetable/provenance fields, verification invalidation, safe admin bootstrap and revocation of the legacy GPS RPC.
3. `migrations/20261030140136_bustrack_function_grants.sql` — remove Supabase's explicit anonymous function grants and protect trigger-only functions.
4. `seed.sql` — insert-only historical 2025–26 routes, stops and placeholder `SIM-*` vehicles; no real contacts or credentials. Existing rows are not overwritten or automatically deleted.

`python3 scripts/generate_seed.py` regenerates the seed from `data/lords-routes-2025-26.json`. The timetable is historical and unverified as current. Contains data provided by TGSRTC; mapped locations are approximate and the seed geometry is not an authorized GPS corridor.

The location API accepts GPS only on a staff-verified corridor; editing stop positions/order invalidates that verification. Direct client inserts to `bus_locations` and execution of the older, weaker `submit_bus_location` RPC are revoked. Students cannot change their own roles. The hosted project is seeded and its basic grants were checked, but signed-in Auth, Realtime delivery, full hosted RLS and driver-device GPS have not been tested end to end.

See [SETUP.md](../docs/SETUP.md), [SECURITY.md](../docs/SECURITY.md), and [REAL_GPS.md](../docs/REAL_GPS.md) before connecting a project or collecting real locations.
