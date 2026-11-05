# BusTrack design system

This system records **BusTrack's own existing UI**, measured from its source and checked in the browser. The supplied design playbook is a methodology (measure, name, reuse, verify), not a site whose visual identity should be copied. No third-party skills, logos, icons, fonts, illustrations or text were imported.

## Audit and decisions

Before this pass, the most frequent text utilities in `app/` and `components/` were `text-slate-500` (81 uses), `text-navy-950` (67), `text-brand-600` (35); the most frequent corners were `rounded-xl` (62), `rounded-2xl` (42) and `rounded-3xl` (10). Blue `#1c5ff0`, ink `#0a182c`, pale canvas `#f3f7fc` and map blue-grey `#eaf1f8` were already in use. These measured values—not an imagined reference brand—are the basis for the semantic roles below. Counts are a snapshot, not a target to optimize.

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Primary action | `--color-brand-600` | `#1c5ff0` | CTA, active navigation, selected stop |
| Primary hover | `--color-brand-700` | `#164bdc` | Button hover, links |
| Ink | `--color-ink` / `--color-navy-950` | `#0a182c` | Headlines and dark status cards |
| Supporting ink | `--color-ink-muted` | `#475569` | Helper text on light surfaces |
| Canvas | `--color-canvas` | `#f3f7fc` | Page background |
| Surface | `--color-surface` | `#ffffff` | Cards and input surfaces |
| Muted surface | `--color-surface-muted` | `#f8fafc` | Supporting panels |
| Border | `--color-border` | `#e2eaf6` | Quiet dividers |
| Map fallback | `--color-map-surface` | `#eaf1f8` | Schematic/empty map |
| Focus | `--color-focus` | `#1c5ff0` | Visible keyboard focus |

The full brand/navy ramps, radii, shadows and font stack live in `app/tokens.css`. `tailwind.config.ts` maps those variables to existing `bg-brand-*`, `text-navy-*`, `rounded-*` and `shadow-*` utilities. Change the token source instead of adding another near-identical hex value. Slate/emerald/amber/rose remain Tailwind semantic colors for supporting text and real status states. Never encode state by color alone: include text and/or an icon.

## Layout and components

- **Typeface:** Inter if installed, then system sans. A legible 14–16px body, 11–12px metadata; dashboard hero headline scales from 28px on phone to 44px on wide screens. The 4px spacing rhythm underlies 8/12/16/20/24px gaps.
- **Geometry:** controls 12px; ordinary cards 20px; feature/hero panels 28px; badges are pills. Use `Card`, `Button`, `Badge`, `PageHeader`, `Input` and `Select` rather than local one-off versions.
- **Hierarchy:** a single route selector near the dashboard greeting; the prominent dark ETA card; route map and next stops below. Keep status and data provenance visible before controls. Pages other than the dashboard use `PageHeader` and the same card/panel treatment.
- **Navigation:** desktop sidebar from 768px with an obvious active item; sticky desktop/mobile header; phone bottom tabs at least 48px tall. The "More" sheet keeps staff/profile/login accessible without squeezing the primary four tabs.
- **Interaction:** at least 44px for principal inputs/buttons, visible focus rings, restrained hover lift, and reduced-motion support. Never hide needed information behind hover.
- **Data trust:** `DEMO MODE`, simulation tags, approximate-map wording, historical-time caveats and stale/paused states must remain legible. A premium appearance must never suggest the buses are live unless actual verified GPS is present.

## Check a UI change

1. Reuse a named token; if a new role is necessary, add it here and to `app/tokens.css` before using it.
2. Check `/`, `/track`, `/routes`, `/login`, `/auth/set-password`, `/driver` and `/admin` at 320, 375, 430 and 1440px; make sure the document does not scroll horizontally.
3. Exercise route switching, stop selection, demo/offline states, sign-in form, and keyboard focus. Check map fallback and `prefers-reduced-motion`.
4. Run `npm run check` and `npm run lint`; never claim real GPS or email delivery has been verified by these UI checks.
