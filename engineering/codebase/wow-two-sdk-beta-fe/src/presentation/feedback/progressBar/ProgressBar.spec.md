# ProgressBar

Renders a linear progress bar with an optional label above it.

Source: [ProgressBar.vue](ProgressBar.vue).

Public import: `import { ProgressBar } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `size` | `Size` | no | — | The track thickness. |
| `tone` | `ProgressTone` | no | — | The fill tone palette. |
| `value` | `number` | no | — | The current value 0–100. Pass `undefined` for indeterminate. |
| `max` | `number` | no | `100` | Declared by the source contract. |
| `label` | `string` | no | — | The accessible label for the progress. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
