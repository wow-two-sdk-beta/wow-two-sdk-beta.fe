# ComboboxPickerInput

Renders the text box driving the combobox — it opens the panel, filters rows, and owns arrow-key nav.

Source: [ComboboxPickerInput.vue](ComboboxPickerInput.vue).

Public import: `import { ComboboxPickerInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useComboboxContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `size` | `InputSize` | no | — | The control size. |
| `state` | `InputState` | no | — | The validity surface. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el: ctx.inputEl }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
