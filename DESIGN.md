# BusTrack design system

BusTrack is a quiet transport utility. Since November 2026 it also has one public surface—the homepage at `/`—whose job is to explain the service and send people to `/login`; everything behind it stays an app, not a brochure. The design playbook supplied by the user informed the process—measure existing screens, name roles, build, then check phone and desktop screenshots—not another site's visual identity. No third-party skill archive, imagery, font, copy or brand assets were installed.

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

- **Type:** Overpass (variable, weights 100–900), self-hosted from `app/fonts/` through `next/font/local` with a size-adjusted Arial fallback; no network font request. Overpass descends from Highway Gothic, the US road-sign face, which keeps the interface in the vocabulary of transit signage rather than generic SaaS. Headings are semibold and tightly tracked (−0.03 em at display sizes); body copy is 14–16px; secondary copy is at least 12px, with 11px reserved for numeric badges and the mobile tab labels. Overpass ships proportional figures, so ETAs, clock times, counts and progress use `tabular-nums`. The committed woff2 is the Fontsource build of Overpass 4.000 with one metadata fix (`scripts/fonts/patch-overpass.py`): the upstream file lists the middle dot and the spacing accents in the GDEF mark class, which HarfBuzz renders at zero width. One big ETA, not a grid of competing numbers.
- **Space:** 4px rhythm; 16–32px section gaps. Use white space and hairlines to group content, not multiple nested panels.
- **Shape:** 10px controls, 16px cards, 20px feature panels. Pills are for real state labels only.
- **Depth:** a hairline border and near-invisible card shadow, with a stronger shadow reserved for overlays. No decorative background glows, tile-grid over the ETA, hover translation, or blue-filled navigation rail.
- **Components:** use `Card`, `Button`, `Badge`, `PageHeader`, `Input` and `Select`. A single route selector on the dashboard; no redundant header selector there. Route list is scannable before opening the ordered stops.
- **Responsive:** navigation becomes a bottom bar on phones; the primary ETA and selected stop are readable at 320px without horizontal scroll. Inputs/buttons are at least 44px where principal actions occur.
- **Trust:** demo mode is gone, so nothing is labelled `DEMO MODE` any more; what remains is honest provenance. Label simulation, historical pickup times, unmapped stops, stale locations and schematic geometry in text; never imply live GPS or real-time traffic from a decorative UI. A tile-loading schematic is still a schematic, not a verified route.

## Check a UI change

1. Reuse or amend a token rather than introducing a near-duplicate color/shadow.
2. Check `/`, `/login`, `/signup`, `/auth/set-password`, `/dashboard`, `/track`, `/routes`, `/driver`, `/admin`, `/notifications`, `/profile` and `/bus-details` at 320, 375, 430, 768 and 1440px. Verify no horizontal overflow.
3. Exercise route selection, stop selection, the driver dashboard's simulation disclosure, offline/stale states, map fallback and keyboard focus. Keep reduced-motion support.
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

The shared header always names the data source: `Simulated data` until the selected route carries device GPS, then `Device GPS` or `Last known GPS` as appropriate; on-page caveats still distinguish simulated traffic ETAs from real coordinates. UI checks do **not** prove SMTP delivery, current route times, verified traces, or tested driver hardware.

## Public homepage (November 2026)

`/` is the only unauthenticated page. It was drawn from the reference set the user supplied — navbar.gallery, cta.gallery, landing.love, saaspo.com and curated.design — as *patterns*, not as a visual identity to copy: a sticky header (wordmark, anchor nav, sign-in plus one primary CTA) that collapses to a `#site-menu` disclosure on phones; a hero with one claim, one primary action and one secondary action; alternating `canvas | surface | navy` section tones so the page reads in bands rather than as a wall of cards; a numbered how-it-works sequence; role cards; a data-honesty panel; an FAQ; and a closing CTA band with primary/secondary buttons and small print.

Homepage-specific rules:

- **Components:** `components/home/site-header.tsx` (client, reads `useApp()` to swap "Sign in" for "Open dashboard"), `components/home/route-schematic.tsx` (numbered stop line built from `sampleRoutes[0]`), `components/home/sections.tsx` (`HOME_STATS`, `Section`, `FeatureGrid`, `HowItWorks`, `RoleCards`, `DataHonestyPanel`, `Faq`, `CtaBand`, `SiteFooter`).
- **Numbers are real or labelled.** `HOME_STATS` (16 routes, 154 stops, 117 located, 37 unlocated, 145 with a published time, schedule year 2025–26) is computed from `data/routes.ts`, not invented. The route schematic carries an amber "Estimated times" badge and a provenance footer; it never claims live positions.
- **Honesty is part of the layout.** The data-honesty panel states that ETAs come from published pickup times, live positions need an authorized driver device, geometry is inferred from OpenStreetMap, "Contains data provided by TGSRTC", and the transport-office contacts are placeholders. Do not soften these lines for marketing effect.
- **New tokens:** the homepage reuses `--color-canvas`, `--color-surface`, `--color-surface-muted`, `--color-line`, `--color-ink` and `--color-ink-muted`; the `navy` section tone is `--color-navy-950` with `--color-navy-300`-family text. No new brand colours were introduced.
- **Access:** the header and CTA band point at `/login` and `/signup`; the app lives at `/dashboard` behind `RequireAuth`. Signed-in visitors get "Open dashboard" instead of a sign-in prompt.

## Motion & gestures (November 2026)

The premium pass added [Motion](https://motion.dev) (`motion` 14.9, ≈36 kB gzipped loaded once through `LazyMotion` + `domMax`) without changing any data flow, auth gate, schema or API. The rules below keep it subtle and honest; everything still works without the gesture, and no animation ever stands in for real tracking.

- **One vocabulary.** `lib/motion.ts` holds the eases (`EASE_OUT`, `EASE_IN_OUT`), durations (`DURATION.fast/base/slow`), springs (`SPRING.tap/gentle/sheet/snappy`), shared variants (`fadeUp`, `fadeIn`, `scaleIn`, `staggerChildren`), `REVEAL_VIEWPORT`, and the press/hover targets `TAP`, `TAP_SOFT`, `HOVER_LIFT`. `lib/gestures.ts` holds the pure gesture maths (`resolveSwipe`, `shouldDismiss`, `nearestSnapPoint`, `dampPull`, `pullProgress`) so thresholds are unit-tested rather than tuned in components.
- **Provider.** `components/motion/motion-provider.tsx` wraps the app in `LazyMotion strict` + `MotionConfig reducedMotion="user"`. Use `m.*`, never `motion.*`, and load features only through `components/motion/features.ts`.
- **Building blocks.** `Reveal`/`RevealGroup`/`RevealItem` (scroll-triggered, once), `CountUp` (homepage and notification statistics; initial text is the final value so SSR/no-JS still reads correctly), `BusIllustration` (looping wheels/road dash on the homepage only), `AnimatedValue` (ETA digits), `PageTransition` (entrance-only rise keyed by pathname), `PullToRefresh` (custom non-passive touch listeners, damped to 120 px), `SwipeRow` (notification rows), `BottomSheet` (portaled, swipe-to-dismiss, body scroll lock), `DragSheet` (Track page; snaps `peek | half | full`, keyboard "Expand route details" button), and the swipeable/expandable `RouteCard`.
- **SSR-critical content uses CSS, not Motion.** Hero text and the auth screens enter with the `rise`/`word-rise` keyframes (`fill: both`) so the LCP element is visible before hydration and in screenshots. Motion `initial="hidden"` is only for content below the fold or rendered after sign-in.
- **Page transitions are entrance-only.** In the App Router the layout's `children` slot already shows the new page as soon as the URL changes, so an `AnimatePresence mode="wait"` exit would fade the *new* page out and in again. The wrapper simply rises in and settles to `transform: none`, which also keeps `position: fixed` overlays sane.
- **Hover on motion elements uses `whileHover={HOVER_LIFT}`**; Motion owns `style.transform`, so Tailwind `hover:-translate-y-*` classes do nothing there. Taps use `whileTap={TAP}` on buttons and `TAP_SOFT` on large cards.
- **Swipe surfaces are opaque and the action layer only exists while displaced.** `RouteCard` and `SwipeRow` drive the coloured layer's opacity from the drag offset (`useTransform(x, [-6, 0, 6], [1, 0, 1])`) and keep a solid `bg-white`/`bg-brand-50` foreground — translucent foregrounds let the blue/rose layers bleed through at rest.
- **Grids with truncated children declare `grid-cols-1`.** An implicit grid track sizes to max-content, so `grid md:grid-cols-2` with `truncate` or nowrap children overflows a 390 px viewport. Route names now wrap (`line-clamp-2`) rather than truncate.
- **Overlays portal to `document.body`.** Transformed ancestors become containing blocks for `position: fixed`; `BottomSheet` and `Dialog` portal, while the Track `DragSheet` is deliberately `absolute` inside the map container and offsets Leaflet controls with `bottomInset`/`--map-inset-b` (attribution is never hidden).
- **Reduced motion.** `app/globals.css` zeroes CSS animation/transition durations; `MotionConfig reducedMotion="user"` drops Motion transforms and layout animations (opacity fades remain); imperative `animate()` calls check `useReducedMotion` (see `DragSheet`). Nothing is hidden at rest except decorative gesture hints and the resting pull indicator.
- **Measured.** Mobile 390/320 and desktop 1440 production screenshots show no horizontal overflow; the signed-in smoke exercises sheet dismissal, route-card swipes, snap points, notification swipes, pull-to-refresh and sidebar navigation with zero page errors. First-load JS for `/` went from 205 kB to 272 kB and `/dashboard` from 214 kB to 280 kB, almost entirely the shared Motion chunk.

## Frosted glass (November 2026)

Glass is a *material for chrome*, not a decoration for content. It appears where a surface floats over something else — the sticky site and app headers, the mobile bottom navigation, bottom sheets and dialogs, the Track drag sheet over the map, map chips and controls, the hero schematic card, the dark panels on the navy band, and the sign-in card — and nowhere on the plain canvas, where a translucent card would only reduce text contrast.

- **Tokens** (`app/tokens.css`): `--glass-blur` 20px, `--glass-saturate` 1.7, `--glass-bg` (white 72%, chips and tiles), `--glass-bg-strong` (white 90%, headers/navigation/sheets with dense text), `--glass-bg-dark` (white 8%, panels on navy), `--glass-line`, `--glass-highlight`, `--shadow-glass`/`--shadow-glass-dark`.
- **Utilities** (`app/globals.css`, components layer): `.glass`, `.glass-strong`, `.glass-dark` set the backdrop filter and background; `.glass-edge` adds the lit rim (1px inner highlight, hairline border, soft drop shadow). `Card tone="glass"` and `Button variant="glass"` wrap the same classes. `.glow-blob` is a static blurred circle placed behind glass so the blur has colour to show; it is `aria-hidden`, pointer-transparent and painted once.
- **Fallbacks.** Without `backdrop-filter` support the surfaces become 96% white; under `prefers-reduced-transparency: reduce` they are fully opaque, blur is off and glow blobs are hidden. Leaflet's zoom and attribution controls follow the same rules.
- **Keep the backdrop reachable.** A glass element only blurs what lies behind its nearest *backdrop root*; any ancestor with `opacity < 1`, a `filter`, a mask or a blend mode becomes that root and the blur stops showing the page. This is why the CSS entrances (`rise`, `word-rise`) use `animation-fill-mode: backwards` rather than `both`: a finished fill-forwards opacity animation would keep the wrapper as a root. Motion entrances end with `opacity: 1` and `transform: none`, which is fine; do not leave `will-change: opacity` on glass ancestors.
- **Contrast floor.** Text on glass is navy-950 or slate-600 on at least 72% white (90% where paragraphs sit on it); never place body copy on `.glass-dark` lighter than `white/75`. Glass never encodes state — selected rows and status pills keep their solid tints.
- **Measured.** Computed `backdrop-filter` contains `blur(` on every rendered glass surface across `/`, `/login`, `/dashboard` (page, stop sheet), `/track` (drag sheet, chips) at 390 px; no horizontal overflow at 320/390/1440; reduced-transparency emulation yields opaque white surfaces with no filter; zero page errors.


## Skills review (November 2026)

A second pass used five public design skills as lenses — Anthropic's `frontend-design` to build, UI UX Pro Max and the Taste skill (`copy-tells.md`) to style and write, Impeccable's detector and the Vercel Web Interface Guidelines to check. Nothing from them was installed into the product: the detector ran in a sandbox against the rendered pages (`scripts/browser/impeccable-scan.cjs`, one headless Chromium per page over CDP, with a seeded fake session for the signed-in screens), and the guidelines were applied by hand.

**Baseline (before).** Impeccable reported primary findings on all nine scanned page/viewport pairs: `overused-font` (Inter), `low-contrast` (slate-400 at 2.6:1, white on rose-500 at 3.7:1), `kicker-above-heading` ×5 (the small-caps eyebrows), `nested-cards` ×5 (Google notice box, notification items), `tiny-text`/`undersized-ui-text` (10–11px body and tab labels), `line-length` (~101 characters), `text-occlusion` (the schematic chip under the Track sheet) and one false positive on a CSS triangle. The Taste copy lint added a stat strip and blue accent words in the hero, "actually", middle-dot meta strings, "→" on buttons and em-dash saturation.

**Decisions (user):** switch the typeface to Overpass; remove the three hero stat tiles (the catalogue numbers now live in the prose and the "What is estimated" section where they can be explained); limit scroll-triggered reveals to the hero entrance and the route-timeline draw — section text and card grids render immediately. Count-up stays on ETA digits and alert badges.

**What changed.**

- *Type and colour.* Overpass replaces Inter (see Tokens). `slate.500` is overridden to `#5f6e84` so secondary text clears 4.5:1 on white, canvas and `brand-50`; every `text-slate-400` became `text-slate-500`; the unread badge is `red-600` (4.8:1) instead of `rose-500`; `--glass-bg-strong` is 90% white. `theme-color` matches the white page. Headings `text-wrap: balance`, running text `text-wrap: pretty`.
- *Sizes.* No body text below 12px: `text-[10px]`/`text-[11px]` became `text-xs` except for numeric badges and the bottom-navigation labels (11px, medium). Alerts and explanatory paragraphs cap at ~60ch so lines stay under 80 characters on desktop.
- *Structure.* One frame per surface: the Google notice is an icon-and-text row, notification items are divided rows with an unread tint, the map is an inset panel inside its card rather than a bordered card of its own, alerts are tinted but borderless, empty states use a plain icon and a paragraph (not an `h3` after an `h1`), and the preference/trip rows use hairline dividers. The schematic chip moves up with the Track sheet (`--map-inset-b`).
- *Copy.* Headline in one colour; no eyebrows; sentences instead of middle-dot strings in prose ("Simulated location, not live"); "Create a student account" is the same button name through header, hero, CTA band and form; links are verb + object ("See the 2025–26 pickup times") without arrows; "actually", "journey" and the "honest" self-descriptions are gone.
- *Forms.* The email field declares `inputMode="email"`, `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}` and a `name`; the "or" separator only appears when Google sign-in is switched on.
- *Maps.* Leaflet uses the SVG renderer; the canvas renderer's teardown could race a pending redraw and log `Cannot read properties of undefined (reading 'clearRect')`.

**Measured (after).** Impeccable reports 0 primary findings on `/`, `/login`, `/signup` (390), `/`, `/dashboard`, `/routes`, `/track` (390 and 1280), `/notifications`, `/bus-details`, `/profile` (390); the only waived rule is the `border-accent-on-rounded` inline ignore on the Leaflet tooltip arrow in `app/globals.css`. No horizontal overflow at 390 or 1280; no page errors; 137 tests.
