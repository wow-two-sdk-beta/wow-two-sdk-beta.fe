# ProgressStepsIndicator

Renders N-of-M progress dots or pills joined by connectors, horizontally or vertically.

Source: [ProgressStepsIndicator.vue](ProgressStepsIndicator.vue).

Public import: `import { ProgressStepsIndicator } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `steps` | `ReadonlyArray<string>` | yes | — | The step labels in order. |
| `current` | `number` | yes | — | The index of the active step (0-based). Steps before are marked complete. |
| `orientation` | `Orientation` | no | `OrientationToken.Horizontal` | The layout direction. Default `horizontal`. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
