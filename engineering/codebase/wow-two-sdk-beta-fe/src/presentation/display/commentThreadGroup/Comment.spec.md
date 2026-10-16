# Comment

Renders one comment: avatar and collapse rail, header line, body, actions, and nested replies.

Source: [Comment.vue](Comment.vue).

Public import: `import { Comment } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `author` | `string \| number` | yes | — | The author name. Rich content → the `author` slot. |
| `timestamp` | `string \| number` | no | `undefined` | The timestamp / metadata. Rich content → the `timestamp` slot. |
| `defaultCollapsed` | `boolean` | no | `false` | The initial collapsed state for replies. |
| `isHighlighted` | `boolean` | no | `undefined` | The highlighted state — marks as the OP / highlighted comment. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `avatar` | `avatar(): unknown;` | The avatar / author photo. |
| `author` | `author(): unknown;` | The author-name override, when a plain string is not enough. |
| `badge` | `badge(): unknown;` | The trailing chip for badges (e.g. "OP", "Author"). |
| `timestamp` | `timestamp(): unknown;` | The timestamp override, when a plain string is not enough. |
| `default` | `default(): unknown;` | The body / content — the default slot. |
| `actions` | `actions(): unknown;` | The footer actions (e.g. Reply / Vote / Report). |
| `replies` | `replies(): unknown;` | The nested replies — pass `Comment` items. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
