# MenuItem

Renders one activatable menu row; the arrow keys walk the enabled siblings.

Source: [MenuItem.vue](MenuItem.vue).

Public import: `import { MenuItem } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within the owner supplying `useMenuContext`; a compound part is not an independent root.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `state` | `MenuItemState` | no | `undefined` | The visual state of the item. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state — blocks activation. |
| `canCloseOnSelect` | `boolean` | no | `true` | Closes the whole menu tree after activation; `false` keeps it open for repeated actions. |
| `closeOnSelect` | `boolean` | no | —      | Deprecated — use `canCloseOnSelect`; removed next release.                               |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [];` | Fires when the reader activates the row with Enter, Space, or a click; the menu tree closes after by default. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [LiveValues.dom.test.ts](../../../../tests/unit/presentation/nav/LiveValues.dom.test.ts) · [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Interaction guarantees

Arrow, Home and End walk every enabled row kind of the menu, wrapping at the edges. A mouse move focuses the row, so pointer and keyboard share one highlight; touch and pen only activate. Inside a submenu, activation closes the whole menu tree.
