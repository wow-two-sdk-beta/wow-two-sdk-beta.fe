# ToastHost

Renders the app's transient notification stack. Mount once per app.

Source: [ToastHost.vue](ToastHost.vue) holds the enums, props, template and wiring. The rest of the host:

| File                                                                                                                   | Holds                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [ToastHostStore.ts](ToastHostStore.ts)                                                                                 | the `toastHost` store and toast priority order                                        |
| [ToastOptions.ts](ToastOptions.ts) · [ToastEntry.ts](ToastEntry.ts) · [ToastPromiseOptions.ts](ToastPromiseOptions.ts) | the options a toast is published with, as the store holds it, and for `promise`       |
| [UseToastHost.ts](UseToastHost.ts) · [UseToastEntries.ts](UseToastEntries.ts)                                          | `useToastHost` and the host's mirror of the store                                     |
| [UseResolvedToasts.ts](UseResolvedToasts.ts) · [UseToastPins.ts](UseToastPins.ts)                                      | duration resolution; pins                                                             |
| [UseToastClock.ts](UseToastClock.ts)                                                                                   | expiry clocks, hover and focus pause                                                  |
| [UseToastCapacity.ts](UseToastCapacity.ts)                                                                             | `max` and height fit, the overflow list and its focus                                 |
| [UseToastExits.ts](UseToastExits.ts) · [UseToastStackMotion.ts](UseToastStackMotion.ts)                                | exit retention and focus hand-off; gap closing, priority promotion                    |
| [UseToastGroupMotion.ts](UseToastGroupMotion.ts)                                                                       | merge preview, count and update highlights                                            |
| [UseToastSwipe.ts](UseToastSwipe.ts)                                                                                   | touch and pen swipe to dismiss                                                        |
| [UseToastHotkey.ts](UseToastHotkey.ts)                                                                                 | the focus hotkey and its way back                                                     |
| [UseToastAnnouncer.ts](UseToastAnnouncer.ts)                                                                           | the polite and assertive live regions                                                 |
| [ToastProgress.vue](ToastProgress.vue) · [ToastRing.vue](ToastRing.vue) · [ToastSeconds.vue](ToastSeconds.vue)         | countdown displays; [UseToastCountdown.ts](UseToastCountdown.ts) runs their animation |
| [ToastHostStyles.ts](ToastHostStyles.ts)                                                                               | class tables the component-only stylesheet scans                                      |

Public import: `import { ToastHost } from '@wow-two-beta/fe/presentation/feedback';`.

Component-only import: `@wow-two-beta/fe/presentation/feedback/toast-host` with `@wow-two-beta/fe/presentation/feedback/toast-host/styles.css`, which scans only the toast chunks (host, card, severity glyphs, the Report action's button) and supplies overridable stacking and slide-motion fallbacks. The consumer provides Tailwind and the semantic colour tokens.

## Contract

- The stack defaults to top right. Higher priorities are closer to the configured anchor. Equal
  priorities take delivery order. New arrivals with higher priority animate past earlier cards.
- The collapsed stack fits the available height up to its `max`. The full-width overflow button opens a
  bounded scrolling view with the same cards in a compact layout and focuses the first hidden item.
  The button or Escape restores the collapsed view and returns focus. Temporary display clocks pause
  while browsing and resume when cards return to the collapsed view; deadlines keep running.
- An exiting toast fades and slides out in its original slot, open details included. The cards farther from
  the anchor slide into the vacated space. Reduced motion skips entry, exit and stack movement.
- Keyboard focus inside an exiting toast moves to the next remaining card, else the previous one, else the
  overflow button. A group change that removes the focused control moves keyboard focus to the card's
  disclosure, else the card. Pointer focus is left alone, so the stack does not stay paused on it.
- `ToastMotion` provides `SideSlide` (`sideSlide`), `ShortSlide` (`shortSlide`), `EdgeSlide` (`edgeSlide`)
  and `SlideAndSettle` (`slideAndSettle`). Vertical presets enter toward the selected top or bottom edge and
  reverse on exit.
- `ToastGroupMotion.Card` shows a full-width preview that travels over the visible stack and merges into its
  group. When details are open, the preview lands at the top of the list. In `ToastGroupMotion.Highlight`
  the count glows as it updates. The count also glows as a Card preview lands.
- A visible toast highlights its surface when its title, description, or severity changes. Highlights come
  on quickly, hold at peak, and fade out slowly. Reduced motion uses a brief steady cue.
- An optional `onDelete` supplies the icon-only Delete control for a retained notice; Close only dismisses its toast.
- Hover and descendant keyboard focus pause expiration while the stack is in use. Standard timed
  toasts offer Pin by default. Pin removes the card's countdown. Unpin restores a fresh timer at its full
  configured duration, subject to hover and focus pause. Close still dismisses a pinned toast. A pin
  lapses, restarting the clock, when the host's or the toast's `canPin` stops allowing it.
- An open details disclosure pauses an ordinary clock; it closes when its toast no longer has details.
- A toast with `progress` is running: it stays up with no clock, timer display or Pin, a deadline included, and
  is not pinned. A progress update changes only the card's bar. An update with `progress: undefined` completes
  it: a fresh countdown starts at its resolved duration and the card highlights as for a content change.
- Each card gets its own `surface`, else the host's, else `solid`. The merge preview takes the card's surface and
  progress. On a `glass` host the overflow button takes the menu glass (`surface-glass-menu`, `border-glass-edge`).
- `toastHost.promise` returns the full settlement chain, preserving resolved values and rejected reasons. Content formatter failures reject that returned promise.
- Dismissal updates subscribers even if an `onDismiss` callback throws; callers still receive that callback error.
- An `expiresAtMs` deadline runs through hover, pin eligibility checks and the queue. Other toasts use
  an explicit `duration`, then the priority duration, then `durations` by severity and `defaultDuration`.
  Setting `priorityDurations` replaces the SDK's priority table and counts notices without a priority as
  Normal. Without a custom table, unclassified notices use their severity duration.
- Shell styles can set `--toast-top-offset`, `--toast-bottom-offset`, `--toast-gutter` and `--toast-width` (the
  card width, default `20rem`, within `--toast-available-width`). The host includes safe-area insets and uses the
  available width below the tablet breakpoint.
- A touch or pen drag across a present card follows the finger and fades toward 0.4 at the dismiss point. A
  release past 40% of the card's width, or a flick (50 px at 0.3 px/ms), toward the anchored side, or either
  side when centered, sends the card off that side and dismisses it; anything less springs back. A mouse, a
  press on a control and a vertical pan (`touch-action: pan-y`) never swipe. The card's ordinary clock holds and
  the card carries `data-toast-swiping` while dragged. Reduced motion drops the follow and spring, not the dismissal.
- `hotkey` (`F8`) moves focus to the present card nearest the anchor, unless a text field has focus. Escape in the
  stack, with the overflow list closed, returns focus to where the key was pressed; so does the last card leaving.
- `timer` picks how an auto-dismissing toast shows its time left. `bar` drains along the bottom edge,
  `ring` drains beside Close, `closeRing` surrounds Close with a dim elapsed arc, and `seconds` counts
  whole seconds beside Close; each display carries its value in `data-toast-timer`. A toast's `timer`
  overrides the host's. The display pauses with expiration, restarts on update, and a display swapped in
  mid-countdown starts from the time already spent. Pinned, sticky and running toasts show no timer. Reduced
  motion hides the bar and rings. Custom `content` uses a bar for any visible timer.
- A non-neutral toast without an `icon` shows its severity glyph; `showSeverityIcon` switches that off for the host, and a toast's own `showSeverityIcon` overrides the host.
- A toast carrying `report` (a captured incident's `send` from `/reporting`) renders a `ReportAction` after its `action`. Clicking it focuses the button, which pauses the stack while the report is in flight.
- The stack is a `region` landmark named by the localized `ToastHost.notifications` (`'Notifications'`), with the
  hotkey through `ToastHost.notificationsHotkey` (`'{label} ({hotkey})'`, `Notifications (F8)`), present while any
  toast shows.
- Two visually hidden live regions, `data-toast-announcer="polite"` and `"assertive"`, read a toast's string title
  and description as sentences when it arrives, when its title, description or severity changes, when its group
  grows (`'{title}: {count} notifications'`, then the latest title) and when its operation completes. Progress
  updates and toasts without string copy stay silent. Danger and Urgent toasts use the assertive region. Changes
  within 120 ms read as one message; more than three arrivals read as `ToastHost.manyArrivals`
  (`'{count} new notifications'`) plus the highest-priority one. Each message clears its region a frame first, so
  repeated text is heard again. Every countdown display is `aria-hidden`.

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop                | Type                                      | Required | Default                         | Meaning                                                                                  |
| ------------------- | ----------------------------------------- | -------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `position`          | `OverlayPosition`                         | no       | `OverlayPosition.TopRight`      | The corner or edge the stack anchors to.                                                 |
| `motion`            | `ToastMotion`                             | no       | `ToastMotion.SideSlide`         | Entry and exit animation.                                                                |
| `groupMotion`       | `ToastGroupMotion`                        | no       | `ToastGroupMotion.Highlight`    | Arrival cue for a group.                                                                 |
| `max`               | `number`                                  | no       | `5`                             | How many toasts show at once; the rest wait in order.                                    |
| `priorityDurations` | `Partial<Record<NoticePriority, number>>` | no       | `DefaultToastPriorityDurations` | Display duration by priority. Setting it applies Normal to unclassified notices.         |
| `canPin`            | `boolean`                                 | no       | `true`                          | Default pin eligibility for ordinary timed cards.                                        |
| `moveDuration`      | `number`                                  | no       | `200`                           | How long the stack takes to close a gap in ms.                                           |
| `defaultDuration`   | `number`                                  | no       | `5000`                          | The auto-dismiss delay in ms for a severity missing from `durations`. `Infinity` = none. |
| `durations`         | `Partial<Record<ToastSeverity, number>>`  | no       | `DefaultToastDurations`         | The auto-dismiss delay per severity; replaces the default table.                         |
| `canPauseOnHover`   | `boolean`                                 | no       | `true`                          | Pauses expiry while the stack is hovered or holds focus.                                 |
| `gap`               | `number`                                  | no       | `8`                             | The px gap between stacked toasts.                                                       |
| `timer`             | `ToastTimer`                              | no       | `ToastTimer.None`               | How each auto-dismissing toast shows its time left; a toast's `timer` overrides.         |
| `showSeverityIcon`  | `boolean`                                 | no       | `true`                          | Shows each severity's glyph on toasts given no `icon`.                                   |
| `surface`           | `ToastSurface`                            | no       | `ToastSurface.Solid`            | The card material; a toast's `surface` overrides.                                        |
| `hotkey`            | `string \| false`                         | no       | `'F8'`                          | The chord that focuses the stack, or `false` for none.                                   |

## Toast options

`toastHost.toast(options)` and `update(id, patch)` accept the `ToastOptions` in [ToastOptions.ts](ToastOptions.ts).
An optional `compact` title and description supply the copy for a standard card in the expanded overflow list.
The compact layout uses the full copy when a card has no `compact` option.
Use `details` for a disclosure and `pauseExpiry` for a reactive action hold. Custom content owns its controls.

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Behaviour, in `tests/unit/presentation/feedback/`: `ToastHostTimer` (displays, countdown bar, durations, pins,
  focus hold), `ToastHostStack` (priority order, capacity, overflow list and compact rows, details disclosure, the
  store), `ToastRunning` (running progress), `ToastCard` (surface, glyphs, content, the component-only stylesheet),
  `ToastHostSwipe`, `ToastHostA11y` (landmark, hotkey, focus after a card leaves, announcements),
  `FeedbackToastHost` (bus-fed toasts and groups) and `ReportAction` (the report action on a toast).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
