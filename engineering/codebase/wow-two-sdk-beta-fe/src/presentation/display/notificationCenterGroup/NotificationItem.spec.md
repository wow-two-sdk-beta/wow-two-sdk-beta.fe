# NotificationItem

Renders one notification row — icon, title, description, timestamp, and an unread dot.

Source: [NotificationItem.vue](NotificationItem.vue).

Public import: `import { NotificationItem } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- An explicit `severity` supplies its glyph unless an icon is supplied. Binding `delete` renders an accessible icon-only Delete control; omission hides it.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `severity` | `Severity` | no | — | Supplies a leading severity glyph. |
| `icon` | `string` | no | — | The leading icon / avatar. Rich content → the `icon` slot. |
| `title` | `string` | no | — | The primary title. Rich content → the `title` slot. Supply this or the slot. |
| `description` | `string` | no | — | The body / description. Rich content → the `description` slot. |
| `timestamp` | `string` | no | — | The timestamp / relative time label. Rich content → the `timestamp` slot. |
| `isUnread` | `boolean` | no | — | The unread flag (bold + leading dot). |
| `actions` | `string` | no | — | The trailing actions. Rich content → the `actions` slot. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [];` | Fires when the reader activates the row by click, Enter, or Space; binding it makes the row interactive (`role="button"`, `tabindex="0"`). Declared as an emit even though `select` is also a DOM event name — this is a component action rather than the native selection event. A `@select` binding reaches this emit, not the (never-fired-on-a-div) native event. |
| `delete` | `delete: [];` | Removes a retained notification; renders only when bound. |
| `dismiss` | `dismiss: [];` | Fires when the reader presses the dismiss button, which renders on hover only when bound. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `icon` | `icon?(): unknown;` | The leading icon. Falls back to the `icon` prop. |
| `title` | `title?(): unknown;` | The title line. Falls back to the `title` prop. |
| `timestamp` | `timestamp?(): unknown;` | The right-aligned timestamp. Falls back to the `timestamp` prop. |
| `description` | `description?(): unknown;` | The body text under the title. Falls back to the `description` prop. |
| `actions` | `actions?(): unknown;` | The action row under the description. Falls back to the `actions` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
