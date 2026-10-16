# ThreadView

Renders the chrome of a thread panel: header, parent message, reply-count separator, composer.

Source: [ThreadView.vue](ThreadView.vue).

Public import: `import { ThreadView } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `title` | `string \| number` | no | `'Thread'` | The title for the thread panel header. Default `"Thread"`. Rich content → the `title` slot. |
| `subtitle` | `string \| number` | no | `undefined` | The subtitle shown under the title (e.g. "in #engineering"). Rich content → the `subtitle` slot. |
| `replyCount` | `string \| number \| null` | no | `undefined` | The reply count label. Left unset it falls back to a count derived from the reply slot; pass `null` to hide the separator row entirely. Rich content → the `replyCount` slot. |
| `hasCloseButton` | `boolean` | no | `true` | The close button's visibility. Default true. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `close` | `close: [];` | Fires when the close button is activated. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `title` | `title(): unknown;` | The title override, when a plain string is not enough. |
| `subtitle` | `subtitle(): unknown;` | The subtitle override, when a plain string is not enough. |
| `parent` | `parent(): unknown;` | The parent message — typically a `ChatBubbleCard`. Required. |
| `replyCount` | `replyCount(): unknown;` | The reply-count label override, when a plain string is not enough. |
| `default` | `default(): unknown;` | The reply nodes — typically `ChatBubbleCard` items. |
| `composer` | `composer(): unknown;` | The composer rendered at the bottom of the panel. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
