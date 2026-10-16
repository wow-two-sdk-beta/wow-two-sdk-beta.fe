# WizardForm

Renders the wizard root, owning the step registry, the active step and the pending flag.

Source: [WizardForm.vue](WizardForm.vue).

Public import: `import { WizardForm } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `currentStep` | `string` | no | `undefined` | The active step id, controlled. The `v-model:current-step` binding target. |
| `defaultCurrentStep` | `string` | no | `undefined` | The initial active step id when uncontrolled. Defaults to the first registered step. |
| `onComplete` | `() => void \| Promise<void>` | no | `undefined` | The completion handler, awaited on the final step's Next. Kept a PROP, not an emit: the root AWAITS its result to hold `isPending`, and an emit returns nothing to await. |
| `canGoBack` | `boolean` | no | `true` | Whether the Back control and step back-jumps are available. Default `true`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:currentStep` | `'update:currentStep': [step: string];` | Fires when the wizard moves to another step — the `v-model:current-step` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
