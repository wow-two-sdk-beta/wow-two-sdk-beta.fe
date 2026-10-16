# NotificationIndicator

Renders a tiny coloured unread dot, absolutely placed over its parent when given `position`.

Source: [NotificationIndicator.vue](NotificationIndicator.vue).

Public import: `import { NotificationIndicator } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `tone` | `NotificationIndicatorTone` | no | `'destructive'` | The color tone. Default `destructive`. |
| `size` | `NotificationIndicatorSize` | no | `'sm'` | The size step. Default `sm`. |
| `hasPulse` | `boolean` | no | `undefined` | The pulsing ring around the dot. |
| `position` | `CornerPosition` | no | `undefined` | The corner position — when set, the dot is positioned absolutely relative to its parent. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
