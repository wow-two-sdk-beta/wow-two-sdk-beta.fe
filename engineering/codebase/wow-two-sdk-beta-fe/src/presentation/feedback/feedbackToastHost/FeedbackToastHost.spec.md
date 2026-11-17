# FeedbackToastHost

Renders the app's transient notification stack from the feedback bus. Mount once per app.

Source: [FeedbackToastHost.vue](FeedbackToastHost.vue).

Public import: `import { FeedbackToastHost } from '@wow-two-beta/fe/presentation/feedback';`.

## Contract

- Mount it once, at the app root, in place of a bare `ToastHost`: both would render every toast twice. Notices
  published before it mounts are dropped.
- A stable notice `id` updates its existing visible toast and refreshes its timer rather than stacking duplicates.
- Retained notices expose Delete and Close icons: Delete calls `bus.remove(id)`; Close and expiration only hide the toast.
- Bus reset/disposal closes this adapter's toasts without dismissing another publisher's toasts. Swapping the bus and unmounting clean up owned subscriptions and toasts, without deleting retained history.
- Retained history is replayed by `NotificationCenterGroup`, never replayed as a toast on mount.
- Each notice becomes one toast. `tone` maps to `severity` and `durationMs` maps to `duration`.
  `title`, `description`, `compact`, `details`, `action`, `priority`, `expiresAtMs`, `canPin` and `report` pass through.
- Matching `group.key` values share one live card with a disclosure containing each notice and its actions.
  Stable IDs update their rows. The card takes the highest explicit priority of its members, and none when no
  member sets one, so the host's `durations` and `defaultDuration` time it. Retention
  and removal keep their per-notice identity.
- Group rows use the notice's optional `compact` copy with its original actions. Buttons can wrap when the
  available width is narrow. Rows without compact copy display the original title and description.
- A full-width divider separates the group header from the scrollable rows. Separators between rows align to their content inset.
- The first card grows in place when it becomes a group. Arrivals use the configured `groupMotion` with the
  details open or closed. Open groups show up to three rows, subject to available height.
  New items appear first. Scrolling or focusing a row holds the reading position.
- A notice paused out by the bus does not pop up unless it meets the bus's `pauseBypass` (`bus.suppresses`), so an
  urgent notice still appears during a pause while routine ones are held.
- `progress` maps to the toast's `progress`; republishing the same id without it settles the same card.
  A grouped row with `progress` shows the compact bar under its copy. The group card has none of its own: it
  stays sticky (`duration: Infinity`) while any member runs and takes its normal duration back when none does.
- `reminderKey` and a registered scheduler enable Remind later, drawn by
  [RemindLaterButton.vue](RemindLaterButton.vue). A pending request holds the toast while preserving its
  timer. Failure leaves the action available for retry. Success dismisses the targeted live notice and
  shows a short confirmation.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ ToastHostProps`. These members remain part of the component surface.

| Prop  | Type          | Required | Default | Meaning                                                                                          |
| ----- | ------------- | -------- | ------- | ------------------------------------------------------------------------------------------------ |
| `bus` | `FeedbackBus` | no       | —       | The bus to render. Default: the app-wide `feedbackBus` singleton (what `notify()` publishes on). |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
