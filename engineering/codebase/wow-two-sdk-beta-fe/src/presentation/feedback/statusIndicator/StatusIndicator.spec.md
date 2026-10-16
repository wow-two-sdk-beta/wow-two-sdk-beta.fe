# StatusIndicator

Renders a colored dot beside a bold label with a smaller helper line beneath it.

Source: [StatusIndicator.vue](StatusIndicator.vue).

Public import: `import { StatusIndicator } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `tone` | `StatusTone` | no | `StatusToneToken.Success` | The semantic status tone. |
| `label` | `string` | no | — | The bold first-line label (e.g. "All systems normal"). Rich content → the `label` slot. Optional so the slot form is usable — supply one or the other. |
| `description` | `string` | no | — | The smaller secondary line (e.g. "Updated 2m ago"). Rich content → the `description` slot. |
| `hasPulse` | `boolean` | no | — | The optional pulsing ring for "live" indication. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown;` | The bold label beside the dot. Falls back to the `label` prop. |
| `description` | `description?(): unknown;` | The helper line under the label. Falls back to the `description` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
