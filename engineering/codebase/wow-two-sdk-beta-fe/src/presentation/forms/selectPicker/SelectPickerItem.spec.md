# SelectPickerItem

Renders one selectable option row, hidden while it misses the panel's search query.

Source: [SelectPickerItem.vue](SelectPickerItem.vue).

Public import: `import { SelectPickerItem } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useSelectContext`; a compound part is not an independent root.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `itemKey` | `unknown` | yes | — | The item key; drives equality, ARIA, and search. |
| `value` | `unknown` | no | — | Optional associated option data; selection updates emit only `itemKey`. |
| `label` | `string \| number` | yes | — | The label shown in the trigger when this item is selected, and the default search text. |
| `text` | `string` | no | — | The searchable-text override; defaults to `label`. |
| `isDisabled` | `boolean` | no | `false` | The disabled state for this item. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The option's content, richer than the `label` prop it falls back to. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
