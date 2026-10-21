# Navbar

Renders a lightweight header band (`<header>`) with `start` / `center` / `end` slots laid out in a row inside a centered `ContainerLayout`.

Source: [Navbar.vue](Navbar.vue).

Public import: `import { Navbar } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Shares its orientation with the `NavItem`s inside: in a top bar each sizes to its label, in a rail each fills the row.
- Renders a `<header>` banner on its own. Inside an `AppShellHeader`, which is already the banner, it renders a `<div>` that fills the bar's row and defaults to no border, a `transparent` surface and the host's height; explicit `as`, `hasBorder`, `variant`, `tone` and `height` still win.
- `glass` paints the `surface-glass` material: the theme's `--glass-fill` (unset, the card at 75%), `--glass-blur`
  (12px) and `--glass-saturate`, with the border in `--glass-edge` (unset, `--color-border`) and the
  `--glass-shadow` (unset, none). It is the solid card where blur is unsupported or reduced transparency is asked.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `as` | `NavbarElement` | no | `header`; `div` in an `AppShellHeader` | The element: `header` (a banner landmark) or `div` (none). |
| `containerAttrs` | `HTMLAttributes` | no | — | Native attributes forwarded to the inner `ContainerLayout`; its `class` is merged last. |
| `containerClass` | `HTMLAttributes['class']` | no | — | Convenience class for the inner `ContainerLayout`, merged after `containerAttrs.class`. |
| `containerSize` | `ContainerLayoutProps['size']` | no | — | The max-width of the inner centered `ContainerLayout`. Passthrough to `ContainerLayout.size`. Default `lg`. |
| `height` | `NavbarHeight` | no | — | The band height. Default `md`. |
| `isSticky` | `boolean` | no | `false` | The sticky pinning of the bar to the top of the scroll container. Default `false` (non-sticky). |
| `sticky` | `boolean` | no | —       | Deprecated — use `isSticky`; removed next release.                                              |
| `tone` | `SurfaceTone` | no | — | The tinted background tone for the band — applies the shadow-less `subtle` surface treatment. Omit for a transparent bar (relies on `bordered` / page bg). |
| `hasBorder` | `boolean` | no | `true`; `false` in an `AppShellHeader` | The bottom border under the bar (the end border for a rail). |
| `bordered` | `boolean` | no | —      | Deprecated — use `hasBorder`; removed next release.                          |
| `orientation` | `NavbarOrientation` | no | `horizontal` | A full-width top bar (`start` / `center` / `end` in a row) or a full-height rail (`start` at the top, `center` scrolling, `end` at the foot). |
| `variant` | `NavbarVariant` | no | `solid`; `transparent` in an `AppShellHeader` | The surface: `solid`, `glass` (the theme's chrome glass, opaque where blur or transparency is unavailable or unwanted) or `transparent`. A `tone` overrides it. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `start` | `start?(): unknown;` | The leading slot — laid out at the start of the row (brand / logo / nav links). |
| `center` | `center?(): unknown;` | The centre slot — laid out in the middle of the row (search / primary nav). |
| `end` | `end?(): unknown;` | The trailing slot — laid out at the end of the row (actions / avatar / CTA). |
| `default` | `default?(): unknown;` | The raw row content — replaces the `start` / `center` / `end` slot layout when provided. Use for fully custom bars. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
