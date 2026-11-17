# FeedbackBus

Headless notice delivery with explicit in-memory retained history.

Public import: `@wow-two-beta/fe/feedback`.

## Notice payload

`FeedbackNotice` carries `tone`, `title`, optional `description`, `compact`, `details`, `action`, `historyAction`, `report`, `id`,
`priority`, `durationMs`, `expiresAtMs`, `canPin`, `group`, `reminderKey`, `progress`, `publishedAtMs`, and
`category`. `NoticeCategory.Transient` is the default; `Retained` keeps the notice in this bus until removal or
scope cleanup. Infinite toast duration does not imply retained history. Rich nodes remain `string | VNode`;
actions are application-owned rendered content and retain native keyboard semantics.

The optional `compact` copy contains a title and optional description for a grouped or overflow row.
Without it those views reuse the notice's full copy. The default toast and History keep the full copy.

`historyAction` overrides the product action in History. Set it to `false` to keep a toast-only action.
The product owns action callbacks and republishes the same id after any domain state changes.

`progress` is a `NoticeProgress` (`value`, `max`, `label`). Its presence marks the operation as still running, and
surfaces render the notice sticky with no countdown. An omitted `value` is indeterminate and an omitted `max`
means 1 at render time; the bus normalizes neither. Republishing the same id without `progress` marks completion.

`publishedAtMs` is the epoch millisecond of the first publication. `PublishedNotice.publishedAtMs` is always set:
the retained entry's own time when the id is already retained (republishing keeps it), else the supplied finite
`publishedAtMs`, else `Date.now()`. A product supplies it when restoring a notice.

## Bus contract

- `notify(notice)` assigns a stable id and isolates published-notice subscriber failures through `onError`.
  Transient delivery has no replay. Retained snapshots are newest-first; reusing an id replaces its existing
  snapshot entry without adding duplicates. Republish the id as transient to drop its retained entry.
- `retained()` returns an immutable shallow snapshot. `subscribeRetained(listener)` immediately sends that
  snapshot and returns an unsubscribe. Snapshot/lifecycle observers cannot break publication or cleanup.
- `remove(id)` deletes only an existing retained notice and asks adapters to close its toast.
- `dismiss(id)` asks adapters to close the live toast of any id, transient or retained. It never changes retained
  history or unread state, and does nothing after `dispose()`.
- `clearRetained()` removes every retained entry, clears unread, cancels their pending reminders, publishes the
  empty snapshot and notification state, and closes each removed id's toast like `remove`. Pause and
  subscriptions stay. It does nothing when the history is empty or the bus is disposed.
- `subscribeDismiss(listener)` wires a toast adapter. It receives a removed id or `null` on reset or when a pause starts.
- `reset()` clears history, unread state, pause and owned toasts while retaining subscriptions for the application scope.
- `dispose()` resets and permanently drops subscribers; subsequent publication has no effect.

`createFeedbackBus({ initialRetained })` explicitly hydrates an application-validated retained snapshot
(`RetainedSeed[]`, a notice with a required `id`), without replaying toasts or reading storage. A seed without a
finite `publishedAtMs` is stamped with the creation time. The application owns serialization, validation, safe display copy
and reconstruction of action/report callbacks or VNodes; raw rich notices are not a JSON storage contract.

Create a bus per application/account scope. Explicit retained categories opt into memory only; no browser
storage, durable persistence, account identification, network or automatic subscriptions are included.
Reset or dispose the scope on identity change. Late publishers must use the disposed old scope.

## History cap

`maxRetained` (default `200`) keeps only the newest N retained entries; it must be a positive integer or
`Infinity`, or creation throws a `RangeError`. After every change to the retained list, and for
`initialRetained`, older entries drop out together with their unread state and pending reminders. A dropped
entry does not close a live toast.

## Pop-up pause and unread state

`setToastPause(until)` takes an epoch deadline, `'manual'` or `null`. A pause closes the bus's
current toasts and suppresses new pop-ups. Publication and explicit retention continue. Timed pauses
resume automatically. Resuming applies to future deliveries. The product can restore its own
stored pause preference by calling `setToastPause()` on the correct bus.

`notificationState()` and `subscribeNotificationState()` expose the pause, `unreadIds` (frozen, newest-first in
the retained list's order) and `unreadCount`, which equals `unreadIds.length`. The snapshot is republished only
when the pause or the unread id set changes. `markNotificationsRead()` clears every unread id and
`markRead(id)` clears one, a no-op when the id is not unread; both preserve the rows. The initial retained
snapshot is treated as read. Removing, clearing or capping an entry also clears its unread state.

`pauseBypass` (a `NoticePriority`, validated at creation with a `RangeError`) lets notices whose priority rank is
at or above it pop up during a pause; a missing priority counts as `normal`. `suppresses(notice)` is `true` when
pop-ups are paused (an elapsed timed pause counts as over) and the notice does not meet the bypass.
Starting a pause still closes every live toast.

## Tracking an operation

`track(work, notices)`, with `notices` a `FeedbackTrackNotices` (`{ running, success, failure }`), publishes `running` under a stable id (`running.id` or a generated
one) with `progress: running.progress ?? {}`. `work` is a promise, or a function called synchronously with
`report(progress)`, which republishes the running notice with that progress. On resolve it publishes `success`
(a notice or `(value) => notice`) under the same id with `progress` removed and returns the value. On reject it
publishes `failure` the same way and rethrows the original error. A synchronous throw from `work` counts as a
rejection. `report` is ignored after settlement. A `success` or `failure` callback that throws rejects the
returned promise with that error. After `dispose()` the promise still settles with the work's outcome and nothing
is published.

## Reminders

`createFeedbackBus({ reminders })` takes a finite positive `delayMs` and a `schedule` function. For a notice
with a stable `reminderKey`, `remindLater` supplies the notice ID, the key, a due timestamp in epoch
milliseconds, and an abort signal. Concurrent requests for the same notice share one operation.
Successful scheduling hides the live toast. Reset, disposal or a changed reminder key aborts pending
scheduling. The product schedules durable delivery and publishes the due notice through the bus.

## Surfaces

`FeedbackToastHost` updates visible toasts by stable id; Close and expiry preserve retained history, while
Delete removes it. `NotificationCenterGroup` takes an explicit `bus` and renders retained rows independently
of whether the toast adapter was mounted. Default bus publication still uses `feedbackBus`/`notify`.

## Verification

Behavior: `tests/unit/feedback/FeedbackBus.test.ts`, `tests/unit/feedback/FeedbackBusHistory.test.ts` and
`tests/unit/feedback/FeedbackBusTrack.test.ts`; surfaces in `tests/unit/presentation/feedback/FeedbackToastHost.dom.test.ts`
and `tests/unit/presentation/feedback/NotificationCenter.dom.test.ts`.
