# InlineSpinner

Renders a spinner beside a label on one line, for buttons, list rows, and mid-flow waits.

Source: [InlineSpinner.vue](InlineSpinner.vue).

Public import: `import { InlineSpinner } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `size` | `SpinnerProps['size']` | no | `'sm'` | Declared by the source contract. |
| `tone` | `SpinnerProps['tone']` | no | `'default'` | Declared by the source contract. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The label beside the spinner. Falls back to `Loading…`. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
