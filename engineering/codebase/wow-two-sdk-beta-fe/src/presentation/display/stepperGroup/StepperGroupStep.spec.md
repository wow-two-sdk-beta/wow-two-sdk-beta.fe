# StepperGroupStep

Renders one step as an index-or-tick button, its label and description, plus a trailing connector.

Source: [StepperGroupStep.vue](StepperGroupStep.vue).

Public import: `import { StepperGroupStep } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Mount within the owner supplying `useStepperContext`, `useRovingFocusItem`; a compound part is not an independent root.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | The value this step selects — pairs it with the `StepperGroupPanel` of the same value. |
| `description` | `string \| number` | no | — | The sub-label under the step title. Fill the `description` slot for richer content. |
| `isDisabled` | `boolean` | no | `false` | The disabled state. Default `false`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | See the declared signature. |
| `description` | `description?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
