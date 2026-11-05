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
