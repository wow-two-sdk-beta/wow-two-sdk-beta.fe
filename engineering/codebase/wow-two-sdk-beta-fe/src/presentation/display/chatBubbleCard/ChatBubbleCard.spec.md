# ChatBubbleCard

Renders one chat message bubble with author, timestamp, delivery status, and a footer slot.

Source: [ChatBubbleCard.vue](ChatBubbleCard.vue).

Public import: `import { ChatBubbleCard } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `side` | `ChatSide` | no | `ChatSide.Start` | The side of the conversation. `start` = them, `end` = me. |
| `tone` | `ChatTone` | no | `undefined` | The bubble color tone. `system` is centered + muted (e.g. "Alex joined"). |
| `author` | `string \| number` | no | `undefined` | The author label (rendered above the bubble). Rich content → the `author` slot. |
| `timestamp` | `string \| number` | no | `undefined` | The timestamp (rendered next to the status row). Rich content → the `timestamp` slot. |
| `status` | `ChatStatus` | no | `undefined` | The delivery state. Hidden when `side === 'start'` by default. |
| `canShowStatusOnStart` | `boolean` | no | `undefined` | The status-on-inbound override — force-shows status even on the inbound side. |
| `isTailless` | `boolean` | no | `undefined` | The tailless mode — hides the bubble's tail (for stacked / grouped messages). |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `avatar` | `avatar(): unknown;` | The avatar, rendered next to the bubble on the same side. |
| `author` | `author(): unknown;` | The author-label override, when a plain string is not enough. |
| `default` | `default(): unknown;` | The bubble body — the default slot. |
| `timestamp` | `timestamp(): unknown;` | The timestamp override, when a plain string is not enough. |
| `footer` | `footer(): unknown;` | The reactions / footer region (e.g. a `ReactionBar`). |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
