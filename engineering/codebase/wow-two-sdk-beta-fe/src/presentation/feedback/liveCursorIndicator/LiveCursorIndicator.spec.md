# LiveCursorIndicator

Renders a remote user's cursor and name label on a collaborative canvas.

Source: [LiveCursorIndicator.vue](LiveCursorIndicator.vue).

Public import: `import { LiveCursorIndicator } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `x` | `number` | yes | — | The pixel offset from the parent's top-left corner. |
| `y` | `number` | yes | — | Declared by the source contract. |
| `name` | `string` | no | — | The display name shown beside the pointer. Rich content → the `name` slot. |
| `color` | `string` | no | `'var(--color-primary)'` | The CSS color used for the pointer fill and label background. |
| `isSmooth` | `boolean` | no | `true` | The smooth-movement toggle between updates. Defaults to true; auto-disables with reduced motion. |
| `labelOffset` | `{ x?: number; y?: number }` | no | — | The pixel offset for the label relative to the pointer. |
| `isPointerOnly` | `boolean` | no | — | The pointer-only toggle — hides the label and shows only the pointer. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `name` | `name?(): unknown;` | The cursor name label. Falls back to the `name` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
