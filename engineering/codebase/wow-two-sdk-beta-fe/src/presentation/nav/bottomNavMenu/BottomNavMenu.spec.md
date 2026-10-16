# BottomNavMenu

Renders the mobile bottom navigation bar — three to five top-level destinations as equal-width tabs.

Source: [BottomNavMenu.vue](BottomNavMenu.vue) · [BottomNavMenuItem.vue](BottomNavMenuItem.vue).

Public import: `import { BottomNavMenu, BottomNavMenuItem } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- The bar is a `<nav>` landmark over a `role="list"` list. Its name is the caller's `aria-label`, else the localized `BottomNavMenu.label` (`'Primary'`).
- By default the bar pins to the viewport bottom on the `z-sticky` tier; `isFixed: false` keeps it in flow. Either way it pads clear of the device's home indicator (`safe-area-inset-bottom`). Pad the page so the fixed bar never covers content.
- Items share the width equally, capped at `max-w-lg` and centred on wide screens.
- The bar holds links, not tabs: no roving focus, and each destination is one Tab stop.

### BottomNavMenuItem

- Renders `<li><a>` with the icon over a truncated label. `isActive` sets `aria-current="page"` and `data-active` (tinted with the primary colour).
- `asChild` merges the item's classes and state onto the slotted router link instead of rendering an `<a>`.
- The icon is `aria-hidden`; the `badge` sits on the icon's corner and stays audible, read before the label. Without an icon the badge sits inline above the label.
- Fallthrough attributes (`href`, `target`, …) and `class` reach the link; the exposed `el` is the link element.

## Props

| Prop      | Type      | Required | Default | Meaning                              |
| --------- | --------- | -------- | ------- | ------------------------------------ |
| `isFixed` | `boolean` | no       | `true`  | Pins the bar to the viewport bottom. |

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
- Focused tests: [BottomNavMenu.dom.test.ts](../../../../tests/unit/presentation/nav/BottomNavMenu.dom.test.ts) — landmark name, current page, badge, `asChild` and localization.
