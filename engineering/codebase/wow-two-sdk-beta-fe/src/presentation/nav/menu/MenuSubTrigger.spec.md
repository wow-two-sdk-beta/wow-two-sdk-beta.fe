# MenuSubTrigger

Renders the menu row that opens its `MenuSub`'s submenu beside it, with a trailing chevron.

Source: [MenuSubTrigger.vue](MenuSubTrigger.vue).

Public import: `import { MenuSubTrigger } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within `MenuSub`; the row joins its parent menu's arrow walk and anchors the submenu.
- The row owns its `id`: the submenu surface is named by it and the row's `aria-controls` points back.
- Disabling the row closes an open submenu and blocks opening.
- Unmount cancels a pending hover open and disposes the menu registration.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `state` | `MenuItemState` | no | `undefined` | The visual state of the row. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state — the submenu cannot open. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The row label. |

## Exposed handle

`{ el }` — the row `<button>`.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts).
- Focused tests: [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts) — keyboard, hover, disabled, RTL and menubar cases.

## Interaction guarantees

- The row renders `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded` and `data-state` (`open` · `closed`).
- Enter, Space and the inline-end arrow (ArrowRight, or ArrowLeft right to left) open the submenu and focus its first enabled row; on an open submenu they move focus into it.
- A click opens the submenu without moving focus into it. A mouse resting 100 ms on the row opens it the same way; touch and pen never hover-open.
- Inside a `MenubarContent`, the row owns the inline-end arrow, so the bar does not move to the next menu.
