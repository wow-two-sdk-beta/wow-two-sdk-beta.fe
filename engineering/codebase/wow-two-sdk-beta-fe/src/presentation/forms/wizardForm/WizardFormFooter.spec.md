# WizardFormFooter

Renders the Back and Next control row, where Next turns into Finish on the wizard's last step.

Source: [WizardFormFooter.vue](WizardFormFooter.vue).

Public import: `import { WizardFormFooter } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `prevLabel` | `string \| number` | no | `'Back'` | The Back button's text. Fill the `prevLabel` slot for richer content. |
| `nextLabel` | `string \| number` | no | `'Next'` | The Next button's text. Fill the `nextLabel` slot for richer content. |
| `submitLabel` | `string \| number` | no | `'Finish'` | The final step's confirm text. Fill the `submitLabel` slot for richer content. |
| `hasPrev` | `boolean` | no | `true` | The visibility of the Prev button when not on first step. Default true. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `prevLabel` | `prevLabel?(): unknown;` | See the declared signature. |
| `nextLabel` | `nextLabel?(): unknown;` | See the declared signature. |
| `submitLabel` | `submitLabel?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
