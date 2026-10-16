# LoadingOverlay

Renders a scrim and centered spinner that block interaction with a region during a long task.

Source: [LoadingOverlay.vue](LoadingOverlay.vue).

Public import: `import { LoadingOverlay } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isOpen` | `boolean` | no | `true` | The mount state. Default `true`. |
| `label` | `string` | no | `'Loading…'` | The caption under the spinner. Default `"Loading…"`. Rich content → the `label` slot. |
| `isInline` | `boolean` | no | `false` | The inline-positioning toggle — the scrim sits absolutely inside the parent (must be `position: relative`). |
| `hasBlur` | `boolean` | no | `false` | The backdrop-blur toggle. |
| `spinnerSize` | `Size` | no | `SizeToken.Lg` | The spinner diameter step. Default `lg`. |
| `spinnerTone` | `SpinnerTone` | no | `SpinnerToneToken.Brand` | The spinner color tone. Default `brand`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | See the declared signature. |
| `label` | `label?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
