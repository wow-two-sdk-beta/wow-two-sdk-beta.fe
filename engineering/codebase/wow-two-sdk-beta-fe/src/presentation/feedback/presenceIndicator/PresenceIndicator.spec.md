# PresenceIndicator

Renders a colored dot encoding a person's presence — online / idle / busy / offline / invisible.

Source: [PresenceIndicator.vue](PresenceIndicator.vue).

Public import: `import { PresenceIndicator } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `status` | `PresenceStatus` | no | `PresenceStatus.Online` | Declared by the source contract. |
| `size` | `Size` | no | `SizeToken.Sm` | The dot diameter. |
| `hasPulse` | `boolean` | no | — | The pulsing-ring toggle (only meaningful for `online`). |
| `position` | `CornerPosition` | no | — | The corner position on a parent (use inside an Avatar wrapper). |
| `label` | `string` | no | — | The accessible-label override. Defaults to status name. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
