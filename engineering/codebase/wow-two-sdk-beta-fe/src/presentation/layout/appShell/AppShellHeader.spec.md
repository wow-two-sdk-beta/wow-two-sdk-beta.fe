# AppShellHeader

Renders the shell's sticky top bar into the `header` grid area.

Source: [AppShellHeader.vue](AppShellHeader.vue).

Public import: `import { AppShellHeader } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- `height` sizes the bar (`sm` 3rem · `md` 3.5rem · `lg` 4rem); `auto` keeps the default as a minimum and lets
  wrapped content grow it.
- `variant` picks the surface from the `Navbar` scale (`NavbarVariant`): `glass` uses the theme's card fill at 75%
  with a backdrop blur, opaque where blur is unsupported or reduced transparency is requested.
- It is the page's banner landmark: a `Navbar` inside renders a plain row that fills the bar instead of a second
  `<header>`, and leaves the border and surface to this bar.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `height` | `AppShellHeaderHeight` | no | `md` | The bar height; `auto` grows with wrapped content. |
| `variant` | `NavbarVariant` | no | `solid` | The surface: `solid`, `glass` or `transparent`. |

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
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
