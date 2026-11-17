# NotificationCenterGroupItem

Renders one notification row — icon, title, description, timestamp, and an unread dot.

Source: [NotificationCenterGroupItem.vue](NotificationCenterGroupItem.vue).

Public import: `import { NotificationCenterGroupItem } from '@wow-two-beta/fe/presentation/display';`.

`NotificationItem` and `NotificationItemProps` remain as deprecated aliases of this component and its props for one release.

## Contract

- `isUnread` renders a leading dot (a `Highlight` fill in forced colors) and visually hidden "Unread" text.
- An explicit `severity` supplies its glyph unless an icon is supplied. `onDelete` (a `@delete` binding) renders an accessible icon-only Delete control; omission hides it. `onSelect` makes the row interactive (`role="button"`, `tabindex="0"`) and `onDismiss` renders the hover Dismiss button.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop          | Type         | Required | Default | Meaning                                                                                           |
| ------------- | ------------ | -------- | ------- | ------------------------------------------------------------------------------------------------- |
| `severity`    | `Severity`   | no       | —       | Supplies a leading severity glyph.                                                                |
| `icon`        | `string`     | no       | —       | The leading icon / avatar. Rich content → the `icon` slot.                                        |
| `title`       | `string`     | no       | —       | The primary title. Rich content → the `title` slot. Supply this or the slot.                      |
| `description` | `string`     | no       | —       | The body / description. Rich content → the `description` slot.                                    |
| `timestamp`   | `string`     | no       | —       | The timestamp / relative time label. Rich content → the `timestamp` slot.                         |
| `isUnread`    | `boolean`    | no       | —       | The unread flag: bold title, leading dot and visually hidden "Unread" text.                       |
| `actions`     | `string`     | no       | —       | The trailing actions. Rich content → the `actions` slot.                                          |
| `onSelect`    | `() => void` | no       | —       | Fires when the row is activated by click, Enter or Space; supplying it makes the row interactive. |
| `onDismiss`   | `() => void` | no       | —       | Fires when the dismiss button is pressed; the button renders on hover only when supplied.         |
| `onDelete`    | `() => void` | no       | —       | Fires when the delete button is pressed; the button renders only when supplied.                   |

## Emits

None declared. `select`, `dismiss` and `delete` are the `onSelect`, `onDismiss` and `onDelete` props above: their presence picks what renders, and a `@select` binding reaches the prop, not the native `select` event.

## Slots

| Slot          | Signature                  | Meaning                                                                           |
| ------------- | -------------------------- | --------------------------------------------------------------------------------- |
| `icon`        | `icon?(): unknown;`        | The leading icon. Falls back to the `icon` prop.                                  |
| `title`       | `title?(): unknown;`       | The title line. Falls back to the `title` prop.                                   |
| `timestamp`   | `timestamp?(): unknown;`   | The right-aligned timestamp. Falls back to the `timestamp` prop.                  |
| `description` | `description?(): unknown;` | The body text under the title. Falls back to the `description` prop.              |
| `progress`    | `progress?(): unknown;`    | The running-progress indicator under the description. Omitting it drops the band. |
| `actions`     | `actions?(): unknown;`     | The action row under the description. Falls back to the `actions` prop.           |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
