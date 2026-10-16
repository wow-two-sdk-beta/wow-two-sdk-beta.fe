# ListboxPickerItem

Renders one selectable option row with its check, checkbox, radio or dot indicator.

Source: [ListboxPickerItem.vue](ListboxPickerItem.vue).

Public import: `import { ListboxPickerItem } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useListboxContext`; a compound part is not an independent root.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `unknown` | yes | — | The item value; compared via the parent listbox's `isEqual`. |
| `isDisabled` | `boolean` | no | `false` | The disabled state for this item. |
| `indicator` | `ListboxPickerIndicator` | no | — | The per-item indicator, overriding the listbox-level indicator. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The option's content, rendered between the leading and trailing indicators. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
