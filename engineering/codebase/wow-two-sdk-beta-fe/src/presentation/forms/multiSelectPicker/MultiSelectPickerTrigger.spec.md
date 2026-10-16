# MultiSelectPickerTrigger

Renders the button that opens the dropdown, showing the selected chips and a chevron; Backspace drops the last.

Source: [MultiSelectPickerTrigger.vue](MultiSelectPickerTrigger.vue).

Public import: `import { MultiSelectPickerTrigger } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useMultiSelectContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `size` | `SelectPickerSize` | no | — | The trigger size. |
| `state` | `InputState` | no | — | The validity surface. |
| `maxVisibleTags` | `number` | no | — | The chip budget handed to the default `<MultiSelectPickerTags />` — past it the rest collapse into a `+N` block. Ignored when the trigger's default slot is filled. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Forms.regression.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.regression.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
