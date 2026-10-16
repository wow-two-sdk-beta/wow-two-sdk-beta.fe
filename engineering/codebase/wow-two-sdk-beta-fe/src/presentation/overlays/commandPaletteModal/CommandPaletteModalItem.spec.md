# CommandPaletteModalItem

Renders one `role="option"` row, hiding itself while the current filter excludes it.

Source: [CommandPaletteModalItem.vue](CommandPaletteModalItem.vue).

Public import: `import { CommandPaletteModalItem } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Mount within the owner supplying `useCommandPaletteContext`; a compound part is not an independent root.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | Declared by the source contract. |
| `searchText` | `string` | no | `undefined` | The text used by the filter; defaults to `value`. A Vue slot's text cannot be read at setup time without invoking the slot outside the render function (which Vue warns about, and which would not work at all for an item filtered out of the DOM), so the fallback is `value` — pass `searchText` whenever the visible label differs from it. |
| `isDisabled` | `boolean` | no | `undefined` | Declared by the source contract. |
| `canCloseOnSelect` | `boolean` | no | `true` | The close-on-activate toggle. Default `true`. |
| `closeOnSelect` | `boolean` | no | —      | Deprecated — use `canCloseOnSelect`; removed next release. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [];` | Fires when the reader activates the row with Enter or a click. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
