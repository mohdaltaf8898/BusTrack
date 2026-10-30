# Optional real GPS design

**Status:** the hosted Supabase schema is configured, but **no routes are verified and real driver-device GPS has not been enabled or end-to-end tested**. The app uses simulation and clearly labels generated positions/timings until an authorized driver shares GPS on a verified route.

## 1. Architecture

```text
Driver browser (HTTPS)
  ├─ Supabase Auth session (access token)
  ├─ /api/trips POST start  -> active trip ID
  ├─ /api/trips POST share  -> sharing_enabled = true
  ├─ navigator.geolocation.watchPosition()
  └─ /api/locations POST    -> validated, service-only guarded database RPC
          ├─ row locks + authorization/route recheck
          ├─ bus_locations + trips.last_location_at in one transaction
          └─ Supabase Realtime INSERT event
                  └─ authorized /api/locations read -> selected-bus dashboard
                     (also polled every 12 seconds)
```

Student pages never call `navigator.geolocation` for driver tracking. They receive authorized trip locations from the database/API.

## 2. Authorization sequence

1. Driver signs in at `/login` with Supabase email/password.
2. The API validates the access token with `supabase.auth.getUser(token)`.
3. The API reads `profiles.role`; driver or admin is required.
4. `POST /api/trips { action: "start", busId, routeId }` checks:
   - bus exists and is not in maintenance,
   - bus route matches the requested route,
   - bus has a driver profile,
   - driver is assigned to the bus (unless caller is admin),
   - any previous active trip for the bus is completed.
5. Server returns a UUID `tripId`.
6. `POST /api/trips { action: "share", tripId, enabled: true }` marks the active trip `sharing_enabled = true`.
7. Only now does `components/driver/driver-dashboard.tsx` request browser Geolocation and start `watchPosition`.
8. Sharing OFF, End Trip, or component unmount calls `clearWatch()` to stop new browser readings. Sharing OFF and End Trip also request a server state change. Unmounting alone does not change server sharing state, and an already in-flight request is not cancelled.

## 3. Ingestion payload

`POST /api/locations` with `Authorization: Bearer <access_token>`:

```json
{
  "busId": "bus-sim01",
  "tripId": "00000000-0000-4000-8000-000000000001",
  "latitude": 17.3418,
  "longitude": 78.368,
  "heading": 82.5,
  "speedKmh": 24.2,
  "accuracyMeters": 12,
  "recordedAt": "2026-10-27T10:15:30.000Z"
}
```

Server fills `route_id` from the trip, sets `source = "gps"`, and stores `status = "active"`. Clients cannot choose source/status/trip/bus arbitrarily.

Database row in `bus_locations`:

```text
id             bigint identity
bus_id         text FK
route_id       text FK
trip_id        uuid FK
latitude       double precision
longitude      double precision
heading        numeric(6,2)       optional
speed_kmh      numeric(6,2)       optional
accuracy_meters numeric(7,2)     optional
source         text               gps | simulation | manual
status         text               active | stale | last_known
recorded_at    timestamptz        device timestamp
created_at     timestamptz        server receipt time
```

## 4. Validation and rejection

API route rejects:

- Missing/invalid token or student role (`401/403`).
- Missing server credentials (`503 DEMO_MODE`).
- Invalid Zod payload (`400`).
- Stale timestamp older than 60s or more than 15s in the future (`422`).
- Coordinates outside valid bounds or the Hyderabad service area (`422`).
- Route geometry not marked `verified` by a trusted operator (`409 ROUTE_NOT_VERIFIED`).
- Coordinates more than 800m from the verified route polyline (`422`).
- Trip not active or sharing disabled (`409`).
- Bus/trip/driver/route mismatch (`400/403/409`).
- Too many updates (`429`).

Direct client writes to `bus_locations` and execution of the older, bounding-box-only `submit_bus_location` RPC are revoked for browser roles. GPS writes go through this API. The historical seed and OSRM estimates are not verified corridors; staff must supply a reviewed trace before live GPS can be accepted.

## 5. Realtime dashboard updates

The migration attempts to add `bus_locations` to `supabase_realtime`. The client subscribes to `postgres_changes` INSERT events for the table. RLS limits readable rows to:

- the assigned driver’s own trip,
- active trips (including last-known position while sharing paused),
- recently completed trips (15 minutes),
- admins.

For the selected bus, an INSERT event triggers an authenticated `GET /api/locations?busId=...` read rather than trusting the event's potentially delayed trip state. The same read is polled every 12 seconds as a fallback; pause/end changes can therefore take approximately one polling interval to appear, longer when offline. Older in-flight reads and reads from a previous identity or selection are discarded.

## 6. Stale and last-known behavior

- A fresh remote location is displayed as **Live GPS** with its recorded timestamp.
- After `NEXT_PUBLIC_STALE_LOCATION_SECONDS` (default 45), the UI shows a stale warning and keeps the last-known marker.
- GPS writes and pause/end changes serialize on the same trip row. A write that acquires the lock first completes before pause/end; after the server confirms pause/end, subsequent writes are rejected. A failed pause request or browser unmount alone does not confirm server-side sharing is off.
- For non-admin users, `GET /api/locations` does not return positions from trips ended more than 15 minutes ago; admins can inspect older positions.
- If no remote location exists, the student dashboard continues to show the labelled simulated marker.

## 7. Device test checklist

This checklist requires a configured Supabase project and a real device; it has **not** been executed in this repository:

1. Deploy over HTTPS.
2. Create admin and driver Auth users; assign roles and bus. Have transport staff verify pickup points and provision a reviewed route corridor first (see SETUP.md).
3. Sign in as driver on the device.
4. Start trip and confirm the server returns a UUID.
5. Enable sharing and grant browser location permission.
6. Confirm an insert appears in `bus_locations` with `source = 'gps'`.
7. Open a student dashboard on another device and confirm Realtime update.
8. Disable sharing; confirm no new inserts and watch stops.
9. End trip; confirm `trips.status = 'completed'` and `sharing_enabled = false`.
10. Attempt an old/off-route coordinate and confirm `422`.
11. Attempt a student token and confirm `403`.
12. Wait >45s and confirm stale warning; wait >15min after trip end and confirm private-location denial.

## 8. Limitations

- Browser GPS accuracy depends on device, satellite visibility, and OS permissions.
- The app does not guarantee background GPS while the screen is locked; a native mobile app is better for production.
- The corridor must be a staff-verified trace; an OSRM estimate is not one. Off-route rejection uses polyline distance, not map matching or proof of the bus route.
- Local PostgreSQL lock-race and hosted rollback checks passed, but actual signed-in Auth, Realtime delivery and driver-device GPS still need end-to-end testing before a pilot.
- Rate limiting is in-memory and should be distributed for production.
- SMS/WhatsApp/server push notification delivery is not implemented.
