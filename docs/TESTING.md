# Testing guide

## Automated checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run check
```

`npm run check` runs typecheck, unit/component tests, and the production build in sequence.

## What the automated suite covers

### `tests/engine.test.ts`

- At least three sample routes.
- Ordered stop distances and stop coordinates aligned to the polyline.
- Route A starts at the correct first stop.
- Movement stays on the route polyline.
- ETA decreases as distance decreases and is never negative.
- Manual delay increases ETA.
- Automatic congestion delay at a deterministic threshold.
- Pause/resume, offline state, and start/end trip events.

### `tests/state.test.ts`

- Credential-free demo initialization.
- Persistence/hydration without stale movement.
- Route switching and selected-stop update.
- One-second tick, ETA, and upcoming-stop recalculation.
- Notification deduplication by event key.
- Mark read/all read/clear notifications.
- Offline status, stale warning, and simulated labels.
- Admin bus validation/delete and stop-geometry synchronization.
- Rejection when a stop delete would leave fewer than two stops.

### `tests/api-security.test.ts`

- `/api/config` does not expose secrets.
- GPS POST without token returns `401`.
- GPS POST with missing backend credentials returns `503 DEMO_MODE`.
- Anonymous trip/admin/location-read requests are rejected.
- Invalid coordinates, stale/future timestamps, and off-route positions are rejected.
- Admin mutation schema rejects unknown resources/fields.

### `tests/auth-role.test.ts`

- A student Auth token is rejected by `requireApiUser(..., ["driver", "admin"])` with `403 FORBIDDEN`.

### `tests/app-shell.test.tsx`

- Mobile bottom navigation is present with `md:hidden`.
- Desktop sidebar is present with `hidden md:flex`.
- The full **DEMO MODE** badge and college context render after hydration.
- Live/routes/more navigation targets exist.

### `tests/core-flows.test.tsx`

- Student dashboard: Route A starting marker, route switching, delay injection, offline/restore, and end-trip buttons.
- Driver dashboard: demo role, reset, start trip, and end trip button state.
- Login: local demo driver role switching.
- Admin: add-bus dialog validation, submission, and table update.

## Manual browser test checklist

Use Chrome and Safari (or an iPhone), plus Android Chrome if available. Test at 320px, 375px, 390px, 430px, 768px, and 1440px widths. Check no horizontal scrolling and that all tap targets are usable.

### Student core flows

1. **No credentials:** start with `.env.local` removed. Confirm `/`, `/track`, `/routes`, `/notifications`, and `/bus-details` all work and show **DEMO MODE**.
2. **Route A starting marker:** open `/track`, select Route A, confirm the bus marker starts at `LIET Main Gate` and the route line/stops are visible.
3. **Movement:** wait 10–20 seconds; confirm the marker moves along the polyline, direction arrow changes, and last update changes.
4. **ETA/upcoming stops:** select a downstream stop; confirm its ETA decreases as the bus advances and departed stops show `0 min`.
5. **Route switching:** switch to Route B, then Route C; confirm route line, bus marker, stop list, bus number, and ETA all update without refresh.
6. **Delay:** trigger the test delay on the dashboard/notifications page; confirm ETA increases, a delay badge appears, and one simulated delay notification is created.
7. **Upcoming-stop changes:** advance/reset simulation; confirm upcoming stop list and statuses change.
8. **Offline:** toggle offline in simulation controls; confirm warning, stale label after the configured threshold, and last-known marker.
9. **Pause/resume/reset:** confirm distance freezes on pause, resumes on resume, and returns to the first stop on reset.
10. **Notifications:** verify all types can be generated (delay, approaching, arrived, trip started, trip completed, location unavailable), timestamps are shown, unread/read works, and duplicate events do not duplicate alerts.
11. **Map:** zoom in/out, center on bus, select stop, rotate/resize viewport, and confirm markers/route stay synchronized. Disconnect network to confirm schematic fallback and retry.
12. **Bus details:** confirm bus number, assigned route, trip status, last reported location, placeholder driver contact, and transport-office contact.

### Driver/admin core flows

13. **Driver demo:** sign in with local demo driver role, open `/driver`, start/end trip, toggle share, pause/resume/reset. Confirm current location/last update/connection status.
14. **Role guard:** as a demo student, confirm `/driver` and `/admin` show access guidance; as driver, `/admin` remains blocked.
15. **Admin CRUD:** as demo admin, add/edit/delete a bus, route, stop, driver assignment, and delay report. Confirm validation errors, confirmation dialogs, empty states, and persistence after refresh.
16. **Real-GPS guard:** without Supabase credentials, confirm the driver UI clearly says GPS is configuration-dependent and does not request device location for students.
17. **Unauthorized GPS:** with a configured test backend, use a student token to POST `/api/locations` and confirm `403`; use stale/off-route coordinates and confirm `422`.

### Configured backend smoke test

18. `/api/config` returns `serverConfigured: true`, `demoMode: false`.
19. `/login` Supabase sign-in works for admin/driver.
20. Admin page loads seeded routes and can refresh backend data.
21. Driver starts a server-authorized trip, enables sharing, and grants Geolocation.
22. Student dashboard receives a Realtime location or polling fallback.
23. Disabling sharing/ending trip stops writes and rejects later GPS POSTs.
24. Student token cannot start trips or mutate admin data.

## Notes on the current environment

- See [`VERIFICATION.md`](VERIFICATION.md) for the exact command results and HTTP smoke-check results.
- The repository includes Vitest/jsdom component tests and a production build check. A full browser automation runner is not included.
- Real Supabase credentials and a driver device are not present; therefore real GPS, Realtime, and server admin writes are documented and unit-validated but not claimed as end-to-end tested.
- OSM tile network access is external; tile loading failures should fall back to the schematic map.
- Browser notification permission cannot be granted automatically; test it manually from `/profile`.
