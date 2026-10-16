# OnboardingChecklistCardTask

Renders one checklist row and registers it with the enclosing `OnboardingChecklistCard` for progress.

Source: [OnboardingChecklistCardTask.vue](OnboardingChecklistCardTask.vue).

Public import: `import { OnboardingChecklistCardTask } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string` | no | — | The task label. Rich content → the `label` slot. Supply this or the slot. |
| `description` | `string` | no | — | The secondary line under the label. Rich content → the `description` slot. |
| `isDone` | `boolean` | no | `false` | Declared by the source contract. |
| `action` | `string` | no | — | The trailing call-to-action, hidden once done. Rich content → the `action` slot. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown;` | The task label. Falls back to the `label` prop. |
| `description` | `description?(): unknown;` | The helper line under the label. Falls back to the `description` prop. |
| `action` | `action?(): unknown;` | The trailing control, hidden once the task is done. Falls back to the `action` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
