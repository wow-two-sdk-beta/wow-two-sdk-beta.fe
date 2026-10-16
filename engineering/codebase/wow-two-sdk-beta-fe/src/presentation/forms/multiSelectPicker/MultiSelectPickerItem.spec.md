# MultiSelectPickerItem

Renders one togglable row of the panel, and registers the chip text the trigger shows for it.

Source: [MultiSelectPickerItem.vue](MultiSelectPickerItem.vue).

Public import: `import { MultiSelectPickerItem } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useMultiSelectContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | The value this row contributes to the selection. |
| `isDisabled` | `boolean` | no | `false` | The disabled state for this row. |
| `label` | `string \| number` | no | — | The chip text registered for the trigger. Defaults to `value`. a slot cannot be captured into the label registry, so the scalar lives here and the default slot renders the row. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
