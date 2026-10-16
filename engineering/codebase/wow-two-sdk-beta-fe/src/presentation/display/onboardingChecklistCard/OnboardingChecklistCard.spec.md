# OnboardingChecklistCard

Renders an onboarding card — title, progress meter, and the checklist rows in its default slot.

Source: [OnboardingChecklistCard.vue](OnboardingChecklistCard.vue).

Public import: `import { OnboardingChecklistCard } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `title` | `string` | no | `'Get started'` | The card heading. Rich content → the `title` slot. |
| `defaultOpen` | `boolean` | no | `true` | Declared by the source contract. |
| `canDismissOnComplete` | `boolean` | no | `false` | Declared by the source contract. |
| `dismissDelay` | `number` | no | `2000` | The delay in ms after 100% before unmounting. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `dismiss` | `dismiss: [];` | Fires when the card dismisses itself, `dismissDelay` ms after the reader completes the last task. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The `OnboardingChecklistCardTask` rows driving the progress meter. |
| `title` | `title?(): unknown;` | The card heading. Falls back to the `title` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
