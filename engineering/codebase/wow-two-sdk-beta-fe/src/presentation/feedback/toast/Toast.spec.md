# Toast

Renders a toast card — icon, title, description, actions, and a close button.

Source: [Toast.vue](Toast.vue).

Public import: `import { Toast } from '@wow-two-beta/fe/presentation/feedback';`.

## Contract

- Binding `delete` renders an icon-only Delete control with `deleteLabel`; omission hides it. The caller only binds it for retained notices.
- A non-neutral toast without an `icon` shows its severity's glyph (`SeverityIcons` from `foundation/icons`), coloured with the tone's `-soft-foreground` token, so severity never rests on colour alone. `showSeverityIcon: false` removes it; an `icon` prop or slot replaces it.
- Slot presence is read on every render, so a host that updates a toast in place may add or drop a title, description, action or trailing adornment.
- The `trailing` slot sits between the body and the close button — a countdown or a timestamp.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `severity` | `Severity` | no | — | The semantic severity palette. |
| `icon` | `string` | no | — | The optional leading icon. Rich content → the `icon` slot. |
| `title` | `string` | no | — | The bold heading line. Rich content → the `title` slot. |
| `description` | `string` | no | — | The body text below the title. Rich content → the `description` slot. |
| `actions` | `string` | no | — | The action area below the body. Rich content → the `actions` slot. |
| `closeLabel` | `string` | no | `'Dismiss'` | The accessible label for the close button. Default `"Dismiss"`. |
| `deleteLabel` | `string` | no | `'Delete notification'` | Accessible label for the Delete control. |
| `showSeverityIcon` | `boolean` | no | `true` | Shows the severity's own glyph when no `icon` is given; `neutral` has none. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `delete` | `delete: [];` | Removes a retained notification when activated. |
| `close` | `close: [];` | Fires when the close button is activated. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The extra content below the description. |
| `icon` | `icon?(): unknown;` | The leading icon. Falls back to the `icon` prop. |
| `title` | `title?(): unknown;` | The heading line. Falls back to the `title` prop. |
| `description` | `description?(): unknown;` | The body text below the title. Falls back to the `description` prop. |
| `actions` | `actions?(): unknown;` | The action row. Falls back to the `actions` prop. |
| `trailing` | `trailing?(): unknown;` | The adornment beside the close button — a countdown, a timestamp. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
