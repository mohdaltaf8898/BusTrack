# BusTrack design system

BusTrack is a quiet transport utility, not a marketing landing page. The design playbook supplied by the user informed the process—measure existing screens, name roles, build, then check phone and desktop screenshots—not another site's visual identity. No third-party skill archive, imagery, font, copy or brand assets were installed.

## What changed after the minimalism review

The earlier dashboard repeated its status in multiple colored pills, nested four metric tiles inside a dark card, drew a decorative grid over the ETA, and exposed every simulation control by default. At 375px, this made the actual answer—*when is my bus estimated to arrive?*—hard to scan. The second pass removed those decorations, made the ETA the dominant typographic element, moved secondary facts into simple text rows, flattened the navigation and route list, and put optional demo controls behind an explicit disclosure. The map now shows a clearly labeled schematic while tiles load rather than an empty skeleton.

## Tokens

The brand blue and navy ink already belonged to BusTrack. `app/tokens.css` is their single source of truth; `tailwind.config.ts` maps their RGB channels to opacity-capable utilities. Keep provenance/warning semantics distinct from decorative accent colors.

| Role | Token | Current value | Use |
| --- | --- | --- | --- |
| Action | `--color-brand-600` | `#1c5ff0` | Selected states, primary CTA, focus |
| Ink | `--color-navy-950` | `#0a182c` | Headlines and main data |
| Secondary ink | `--color-ink-muted` | `#475569` | Supporting information |
| Canvas | `--color-canvas` | `#f7f8fa` | Page background |
| Surface | `--color-surface` | `#ffffff` | Cards and controls |
| Muted surface | `--color-surface-muted` | `#f5f6f8` | Quiet grouped content |
| Border | `--color-border` | `#e7e9ee` | Structural divisions |
| Map surface | `--color-map-surface` | `#f0f3f7` | Map fallback, never passed off as geography |

- **Type:** system sans; no network font dependency. Headings are semibold and tightly tracked; primary supporting copy is at least 12px, with smaller type reserved for short badges and mobile tab labels. One big ETA, not a grid of competing numbers.
- **Space:** 4px rhythm; 16–32px section gaps. Use white space and hairlines to group content, not multiple nested panels.
- **Shape:** 10px controls, 16px cards, 20px feature panels. Pills are for real state labels only.
- **Depth:** a hairline border and near-invisible card shadow, with a stronger shadow reserved for overlays. No decorative background glows, tile-grid over the ETA, hover translation, or blue-filled navigation rail.
- **Components:** use `Card`, `Button`, `Badge`, `PageHeader`, `Input` and `Select`. A single route selector on the dashboard; no redundant header selector there. Route list is scannable before opening the ordered stops.
- **Responsive:** navigation becomes a bottom bar on phones; the primary ETA and selected stop are readable at 320px without horizontal scroll. Inputs/buttons are at least 44px where principal actions occur.
- **Trust:** always show `DEMO MODE` for the credential-free demonstration. Label simulation, historical pickup times, unmapped stops, stale locations and schematic geometry in text; never imply live GPS or real-time traffic from a decorative UI. A tile-loading schematic is still a schematic, not a verified route.

## Check a UI change

1. Reuse or amend a token rather than introducing a near-duplicate color/shadow.
2. Check `/`, `/track`, `/routes`, `/login`, `/auth/set-password`, `/driver`, `/admin`, `/notifications`, `/profile` and `/bus-details` at 320, 375, 430, 768 and 1440px. Verify no horizontal overflow.
3. Exercise route selection, stop selection, demo control disclosure, offline/stale states, map fallback and keyboard focus. Keep reduced-motion support.
4. Run `npm run check` and `npm run lint`. UI checks cannot verify SMTP delivery, a real device GPS trace or an authorized bus assignment.

## Whole-app Unslop review (November 2026)

**Attribution:** This review adapts the nine-pass process from [Unslop](https://github.com/heydamir/unslop), created by **Damir Sokolovsky** and licensed **CC BY 4.0**. The implementation, copy and route drawings here are BusTrack-specific; no skill scripts, font, imagery or brand assets were installed.

**Direction confirmed by the user:** Help Lords students find a route and understand an **estimated** arrival. Assured, punctual, grounded. Hyderabad pickup routes, historical timetables and transit wayfinding—not a fake live map. The two moments are a qualified ETA and a numbered route schematic. The signature is the route line linking ordered stops, not decorative lines in the chrome. Applies to student, driver, admin, account and profile screens.

**Audit, before edits:** The previous minimal pass already removed decorative gradients, dashboard metric tiles and empty map placeholders. Remaining issues: a generic greeting/headline on the student screen (`dashboard-header`); repeated demo/status pills (`labels`, page headers); tracked uppercase metadata (`form`, staff and profile screens); many colored icon tiles and extra-bold labels on admin, driver, alerts and login; an always-animated loading shimmer; static “duplicate protection” presented as an alert metric; a 16-row, mostly empty-progress admin overview; and repeated driver simulation controls. None justified replacing the app structure or adding a generated image.

**Passes applied in order:**

1. **Spacing:** Shared input labels, list rows and stat cards now use consistent grouping and padding. The admin overview shows six routes, with the full list still in Health; driver demo scenarios remain available behind a disclosure while primary trip controls stay visible.
2. **Color:** Keep BusTrack navy, blue, white and the existing semantic warning colors. Decorative role/metric icons no longer create a rainbow across staff, account and alert pages; blue belongs to route selection, progress and action. Simulation and stale GPS remain labeled separately.
3. **Icons:** Keep Lucide where icons identify navigation, actions or provenance. Remove metric filler icons and flask decoration from every simulation label; retain clear text as the primary signal.
4. **Copy:** The dashboard names the actual origin, destination and selected stop. Driver copy identifies which screen requests GPS; the track and alerts pages avoid claiming live data. The admin overview uses readable trip state instead of 16 zero-progress bars. Historical timetable and placeholder-contact caveats remain intact.
5. **Type:** Use medium/semibold rather than extra-bold labels and tracked all-caps metadata. Preserve the large ETA and tabular numeric counts; use sentence-case tabs, table headings and form labels. The literal `DEMO MODE` remains uppercase as an explicit provenance flag.
6. **Layout:** Keep the feature and section order, route selector, map/stop split, account forms, and role tools. Dense admin telemetry is progressively disclosed without losing the Health tab or operations. Auth and profile surfaces use the same calm component family.
7. **Details:** Flatten segmented tabs to an underline, badges to compact sentence-case labels and profile/vehicle headers to quiet surfaces. Keep focus rings, text labels for statuses and the numbered stop order line with its “not a verified driving path” caption.
8. **Visuals:** The real product view is the ETA and route schematic, with actual route stops and explicitly approximate geometry. No stock art or decorative hero was appropriate for a transit utility. The schematic is never represented as an official driven trace.
9. **Motion:** Remove looping shimmer and generic width transitions; retain short color/focus changes and the disclosure rotation. Reduced-motion overrides remain in `app/globals.css`.

For the credential-free local demo, `DEMO MODE` stays visible in the shared header. When the selected route carries device GPS, the header switches to `Device GPS` or `Last known GPS` as appropriate; on-page caveats still distinguish simulated traffic ETAs from real coordinates. UI checks do **not** prove SMTP delivery, current route times, verified traces, or tested driver hardware.
