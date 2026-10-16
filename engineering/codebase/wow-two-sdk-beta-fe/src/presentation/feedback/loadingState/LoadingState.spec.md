# LoadingState

Renders a centered spinner, title, and description filling a whole section or page.

Source: [LoadingState.vue](LoadingState.vue).

Public import: `import { LoadingState } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `title` | `string` | no | `'Loading…'` | The heading copy. Default `"Loading…"`. Rich content → the `title` slot. |
| `description` | `string` | no | — | The body text below the title. Rich content → the `description` slot. |
| `size` | `Size` | no | `SizeToken.Lg` | The size of the spinner. Default `lg`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `title` | `title?(): unknown;` | The heading line under the spinner. Falls back to the `title` prop. |
| `description` | `description?(): unknown;` | The body text under the title. Falls back to the `description` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
