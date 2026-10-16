# MessageGroup

Renders a scrolling message viewport with sticky auto-scroll and a jump-to-latest affordance.

Source: [MessageGroup.vue](MessageGroup.vue).

Public import: `import { MessageGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isSticky` | `boolean` | no | `true` | The sticky auto-scroll — scrolls to bottom when children change *and* the viewer is near it. Default true. |
| `bottomThreshold` | `number` | no | `32` | The threshold (px) considered "at bottom" for stickiness. Default 32. |
| `hasJumpToBottom` | `boolean` | no | `true` | The floating "jump to bottom" button's visibility when scrolled away. Default true. |
| `isReversed` | `boolean` | no | `undefined` | The reversed render order (newest at top). v1 keeps natural top→bottom. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `header` | `header(): unknown;` | The region above the message stream (e.g. "load older"). |
| `default` | `default(): unknown;` | The message rows — the default slot. |
| `footer` | `footer(): unknown;` | The region below the message stream (e.g. typing indicator). |

## Exposed handle

`{ el, scrollToBottom, isAtBottom: isNearBottom }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
