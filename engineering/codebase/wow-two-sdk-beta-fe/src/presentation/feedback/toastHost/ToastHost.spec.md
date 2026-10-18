# ToastHost

Renders the toast viewport — subscribes to the global `toastHost` store and stacks `Toast` cards. Mount once, per app.

Source: [ToastHost.vue](ToastHost.vue).

Public import: `import { ToastHost } from '@wow-two-beta/fe/presentation/feedback';`.

Component-only import: `@wow-two-beta/fe/presentation/feedback/toast-host` with `@wow-two-beta/fe/presentation/feedback/toast-host/styles.css`, which scans only the toast chunks (host, card, severity glyphs, the Report action's button) and supplies overridable stacking and slide-motion fallbacks. The consumer provides Tailwind and the semantic colour tokens.

## Contract

- Toasts always anchor top-right. The deprecated `position` prop remains accepted for one release but does not relocate them.
- An optional `onDelete` supplies the icon-only Delete control for a retained notice; Close only dismisses its toast.
- Hover and descendant keyboard focus independently pause expiration; expiration resumes only when both have left.
- `toastHost.promise` returns the full settlement chain, preserving resolved values and rejected reasons. Content formatter failures reject that returned promise.
- Dismissal updates subscribers even if an `onDismiss` callback throws; callers still receive that callback error.
- A toast expires after its own `duration`, else its severity's entry in `durations`, else `defaultDuration`. The default `durations` (`DefaultToastDurations`) keeps a `danger` toast 8 seconds; a `durations` prop replaces that table rather than merging into it.
- `timer` picks how an auto-dismissing toast shows its time left (`ToastTimer`): `bar` drains along the bottom edge, `ring` drains an arc beside the close button, `seconds` counts whole seconds (rounded up) beside it, `none` shows nothing. A toast's `timer` overrides the host's. Every display pauses and resumes with the expiry timer and restarts when the toast updates in place; sticky toasts show none; reduced motion drops the bar and the ring. Custom `content` has no close button, so it takes the bar for a ring or seconds.
- `showProgress` (host) and `progress` (toast) are deprecated aliases: `true` resolves to `bar`, a toast's `false` to `none`. A set `timer` wins over either.
- A non-neutral toast without an `icon` shows its severity glyph; `showSeverityIcon` switches that off for the host, and a toast's own `showSeverityIcon` overrides the host.
- A toast carrying `report` (a captured incident's `send` from `/reporting`) renders a `ReportAction` after its `action`. Clicking it focuses the button, which pauses the stack while the report is in flight.
- The stack is a `region` landmark named by the localized `ToastHost.notifications` (`'Notifications'`), present
  while any toast shows.
- Every countdown display is `aria-hidden`; the polite announcement region carries the latest toast's title.

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop               | Type                                           | Required | Default                            | Meaning                                                                                  |
| ------------------ | ---------------------------------------------- | -------- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `position`         | `OverlayPosition`                              | no       | `OverlayPositionToken.TopRight` | The corner or edge the stack anchors to.                                                 |
| `max`              | `number`                                       | no       | `5`                                | How many toasts show at once; the rest wait in order.                                    |
| `defaultDuration`  | `number`                                       | no       | `5000`                             | The auto-dismiss delay in ms for a severity missing from `durations`. `Infinity` = none. |
| `durations`        | `Partial<Record<ToastSeverity, number>>`       | no       | `DefaultToastDurations`            | The auto-dismiss delay per severity; replaces the default table.                         |
| `canPauseOnHover`  | `boolean`                                      | no       | `true`                             | Pauses expiry while the stack is hovered or holds focus.                                 |
| `gap`              | `number`                                       | no       | `8`                                | The px gap between stacked toasts.                                                       |
| `timer`            | `ToastTimer`                                   | no       | `ToastTimer.None`                  | How each auto-dismissing toast shows its time left; a toast's `timer` overrides.         |
| `showProgress`     | `boolean`                                      | no       | `false`                            | Deprecated — use `timer: ToastTimer.Bar`.                                                |
| `showSeverityIcon` | `boolean`                                      | no       | `true`                             | Shows each severity's glyph on toasts given no `icon`.                                   |

## Toast options

`toastHost.toast(options)` and `update(id, patch)` take `ToastOptions`: `title`, `description`, `icon`, `severity`, `duration`, `action`, `report`, `showSeverityIcon`, `content`, `onDismiss`, `onDelete`, `key`, `timer`, and the deprecated `progress`.

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Behaviour: [ToastHostTimer.dom.test.ts](../../../../tests/unit/presentation/feedback/ToastHostTimer.dom.test.ts) (displays, durations, glyphs, in-place updates), [ToastHostProgress.dom.test.ts](../../../../tests/unit/presentation/feedback/ToastHostProgress.dom.test.ts) (bar animation), [ReportAction.dom.test.ts](../../../../tests/unit/presentation/feedback/ReportAction.dom.test.ts) (the report action on a toast).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
