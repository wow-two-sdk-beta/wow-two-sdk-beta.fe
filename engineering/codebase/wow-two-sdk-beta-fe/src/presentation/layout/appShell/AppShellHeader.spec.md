# AppShellHeader

Renders the shell's sticky top bar into the `header` grid area.

Source: [AppShellHeader.vue](AppShellHeader.vue).

Public import: `import { AppShellHeader } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- `height` sizes the bar (`sm` 3rem · `md` 3.5rem · `lg` 4rem); `auto` keeps the default as a minimum and lets
  wrapped content grow it.
- `variant` picks the surface from the `Navbar` scale (`NavbarVariant`): `glass` paints the `surface-glass` chrome
  material at the theme's glass strength — `--glass-fill` (unset, the card at 75%), `--glass-blur` (12px) and
  `--glass-saturate` (100%) — opaque where blur is unsupported or reduced transparency is requested. Its bottom border
  takes `--glass-edge` (unset, `--color-border`) and the bar takes `--glass-shadow` (unset, none). The `ocharo` theme
  sets the approved frame values.
- It is the page's banner landmark: a `Navbar` inside renders a plain row that fills the bar instead of a second
  `<header>`, and leaves the border and surface to this bar.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `height` | `AppShellHeaderHeight` | no | `md` | The bar height; `auto` grows with wrapped content. |
| `variant` | `NavbarVariant` | no | `solid` | The surface: `solid`, `glass` (the theme's chrome glass) or `transparent`. |

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
