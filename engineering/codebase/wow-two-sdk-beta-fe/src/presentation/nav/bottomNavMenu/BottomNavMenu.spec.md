# BottomNavMenu

Renders the mobile bottom navigation bar — three to five top-level destinations as equal-width tabs.

Source: [BottomNavMenu.vue](BottomNavMenu.vue) · [BottomNavMenuItem.vue](BottomNavMenuItem.vue).

Public import: `import { BottomNavMenu, BottomNavMenuItem } from '@wow-two-beta/fe/presentation/nav';`.

## Contract

- The bar is a `<nav>` landmark over a `role="list"` list. Its name is the caller's `aria-label`, else the localized `BottomNavMenu.label` (`'Primary'`).
- By default the bar pins to the viewport bottom on the `z-sticky` tier; `isFixed: false` keeps it in flow. Either way it pads clear of the device's home indicator (`safe-area-inset-bottom`). Pad the page so the fixed bar never covers content.
- `variant` picks the surface from the `Navbar` scale (`NavbarVariant`): `solid` is the page background under a
  `--color-border` top border; `glass` paints the `surface-glass` chrome material at the theme's glass strength —
  `--glass-fill` (unset, the card at 75%), `--glass-blur` and `--glass-saturate` — opaque (the card) where blur is
  unsupported or reduced transparency is requested, with its top border in `--glass-edge` (unset, `--color-border`);
  `transparent` paints none. Every variant keeps the safe-area padding and the layout. Set the surface through
  `variant`: a `surface-glass` class beside the solid default loses its fill to the page background.
- A glass bar's shadow points up: it takes `--glass-bottom-shadow` (unset, none), the mirror of the top bar's
  `--glass-shadow`, because the page it lifts off sits above it. The top bar's own shadow would fall below the
  screen edge. A theme highlight lines the bar's top edge, inside the shadow.
- Items share the width equally, capped at `max-w-lg` and centred on wide screens.
- The bar holds links, not tabs: no roving focus, and each destination is one Tab stop.

### BottomNavMenuItem

- Renders `<li><a>` with the icon over a truncated label. `isActive` sets `aria-current="page"` and `data-active` (tinted with the primary colour).
- `asChild` merges the item's classes and state onto the slotted router link instead of rendering an `<a>`.
- The icon is `aria-hidden`; the `badge` sits on the icon's corner and stays audible, read before the label. Without an icon the badge sits inline above the label.
- Fallthrough attributes (`href`, `target`, …) and `class` reach the link; the exposed `el` is the link element.

## Props

| Prop      | Type            | Required | Default | Meaning                                                                    |
| --------- | --------------- | -------- | ------- | -------------------------------------------------------------------------- |
| `isFixed` | `boolean`       | no       | `true`  | Pins the bar to the viewport bottom.                                       |
| `variant` | `NavbarVariant` | no       | `solid` | The surface: `solid`, `glass` (the theme's chrome glass) or `transparent`. |

### BottomNavMenuItem

| Prop       | Type      | Required | Default     | Meaning                                              |
| ---------- | --------- | -------- | ----------- | ---------------------------------------------------- |
| `isActive` | `boolean` | no       | `undefined` | Marks the current place.                             |
| `asChild`  | `boolean` | no       | `false`     | Renders the slotted router link instead of an `<a>`. |

## Emits

None.

## Slots

| Slot      | Signature            | Meaning                               |
| --------- | -------------------- | ------------------------------------- |
| `default` | `default(): unknown` | The `BottomNavMenuItem` destinations. |

### BottomNavMenuItem

| Slot      | Signature            | Meaning                                              |
| --------- | -------------------- | ---------------------------------------------------- |
| `default` | `default(): unknown` | The short label, or the router link under `asChild`. |
| `icon`    | `icon(): unknown`    | The icon drawn above the label.                      |
| `badge`   | `badge(): unknown`   | The count or dot on the icon's corner.               |

## Exposed handle

`BottomNavMenuItem` exposes `{ el }` — the link element.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts).
- Focused tests: [BottomNavMenu.dom.test.ts](../../../../tests/unit/presentation/nav/BottomNavMenu.dom.test.ts) — landmark name, current page, badge, `asChild`, localization and the surface classes · [Glass.browser.test.ts](../../../../tests/unit/foundation/styles/Glass.browser.test.ts) — the computed glass fill, edge, shadow and reduced-transparency fallback.
