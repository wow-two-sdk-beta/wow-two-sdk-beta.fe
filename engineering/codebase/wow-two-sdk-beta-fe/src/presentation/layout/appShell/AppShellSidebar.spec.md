# AppShellSidebar

Renders the side navigation rail — the `sidebar` grid area above `sidebarBreakpoint`, a left-edge `Drawer` below it.

Source: [AppShellSidebar.vue](AppShellSidebar.vue).

Public import: `import { AppShellSidebar } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- Mount within the owner supplying `useAppShellContext`; a compound part is not an independent root.
- `variant` picks the rail's surface from the `Navbar` scale (`NavbarVariant`): `solid` is the card fill; `glass`
  paints the `surface-glass-side` material at the theme's glass strength — `--glass-side-fill` (unset,
  `--glass-fill`, else the card at 75%), `--glass-blur` and `--glass-saturate` — opaque where blur is unsupported or
  reduced transparency is requested, with its end border in `--glass-edge`; `transparent` paints none. Below the
  breakpoint, a `glass` sidebar's drawer takes the `glass-menu` surface.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `NavbarVariant` | no | `solid` | The surface: `solid`, `glass` (the theme's sidebar glass) or `transparent`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [ShellRegions.dom.test.ts](../../../../tests/unit/presentation/layout/ShellRegions.dom.test.ts) · [Glass.browser.test.ts](../../../../tests/unit/foundation/styles/Glass.browser.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
