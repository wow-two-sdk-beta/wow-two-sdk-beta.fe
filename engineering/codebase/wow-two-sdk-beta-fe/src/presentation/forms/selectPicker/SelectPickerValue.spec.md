# SelectPickerValue

Renders the selected item's label inside the trigger, or the placeholder while nothing is selected.

Source: [SelectPickerValue.vue](SelectPickerValue.vue).

Public import: `import { SelectPickerValue } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useSelectContext`; a compound part is not an independent root.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `placeholder` | `string \| number` | no | — | The content shown when no item is selected. Fill the `placeholder` slot for richer content. |
| `label` | `string \| number` | no | — | The override for the auto-resolved label, rendered as-is with no item lookup — the default slot. The default slot does the same for richer content. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The label override, rendered with no item lookup. Falls back to the `label` prop. |
| `placeholder` | `placeholder?(): unknown;` | The empty-selection content, richer than the `placeholder` prop can carry. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
