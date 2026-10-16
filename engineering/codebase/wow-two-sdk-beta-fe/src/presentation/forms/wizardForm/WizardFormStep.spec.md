# WizardFormStep

Renders one wizard panel while its step is active, registering the step's metadata and validator.

Source: [WizardFormStep.vue](WizardFormStep.vue).

Public import: `import { WizardFormStep } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `id` | `string` | yes | — | The step id — the value `currentStep` takes when this step is active. |
| `label` | `string \| number` | no | — | The step-strip label. Defaults to the id. |
| `validate` | `() => boolean \| Promise<boolean>` | no | — | The gate run before advancing off this step. Resolving `false` blocks the move. Kept a PROP, not an emit: it RETURNS a verdict (possibly a promise), which an emit cannot do. |
| `isOptional` | `boolean` | no | — | Whether the step strip marks this step `(optional)`. |
| `isFinal` | `boolean` | no | — | Whether this is the last step — Next becomes the submit action. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
