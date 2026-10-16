# FieldErrorCallout

Renders an invalid control's error copy — every merged context error, or one hand-written override.

Source: [FieldErrorCallout.vue](FieldErrorCallout.vue).

Public import: `import { FieldErrorCallout } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `id` | `string` | no | — | The node's own id. An explicit id detaches it from the context's `errorId`, so the control's `aria-describedby` stops referencing it. |
| `message` | `string \| number` | no | — | The single hand-written message — the scalar half of the default slot. Set it (or fill the default slot) to override the context's `errors`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The hand-written message, overriding the context's errors. Falls back to the `message` prop. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
