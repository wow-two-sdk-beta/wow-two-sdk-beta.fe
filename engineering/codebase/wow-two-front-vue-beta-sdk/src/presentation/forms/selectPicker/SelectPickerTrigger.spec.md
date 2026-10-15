# SelectPickerTrigger

Renders the button that opens the dropdown, showing the selection, a chevron, and an optional clear control.

Source: [SelectPickerTrigger.vue](SelectPickerTrigger.vue).

Public import: `import { SelectPickerTrigger } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Size the trigger with `width` / `isFullWidth`, not a width class: a fallthrough `class` lands on the inner
  button, while the wrapper the clear control is positioned against keeps its own width.
- Mount within the owner supplying `useSelectContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `size` | `SelectPickerSize` | no | — | The trigger size. |
| `state` | `InputState` | no | — | The validity surface. |
| `isFullWidth` | `boolean` | no | `true` | Stretches the trigger across its container; `false` sizes it to its value. |
| `width` | `SizeValue` | no | — | The trigger width — number = px, string = any CSS length. Wins over `isFullWidth`. |

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
