# FeedbackBus

Headless notice delivery with explicit in-memory retained history.

Public import: `@wow-two-beta/ui-vue/feedback`.

## Notice payload

`FeedbackNotice` carries `tone`, `title`, optional `description`, `action`, `report`, `id`, `durationMs`, and
`category`. `NoticeCategory.Transient` is the default; `Retained` keeps the notice in this bus until removal or
scope cleanup. Infinite toast duration does not imply retained history. Rich nodes remain `string | VNode`;
actions are application-owned rendered content and retain native keyboard semantics.

## Bus contract

- `notify(notice)` assigns a stable id and isolates published-notice subscriber failures through `onError`.
  Transient delivery has no replay. Retained snapshots are newest-first; reusing an id replaces its existing
  snapshot entry without adding duplicates. Republish the id as transient to drop its retained entry.
- `retained()` returns an immutable shallow snapshot. `subscribeRetained(listener)` immediately sends that
  snapshot and returns an unsubscribe. Snapshot/lifecycle observers cannot break publication or cleanup.
- `remove(id)` deletes only an existing retained notice and asks adapters to close its toast.
- `subscribeDismiss(listener)` explicitly wires a toast adapter; it receives a removed id or `null` on reset.
- `reset()` clears history and owned toasts while retaining subscriptions for the application scope.
- `dispose()` resets and permanently drops subscribers; subsequent publication has no effect.

`createFeedbackBus({ initialRetained })` explicitly hydrates an application-validated retained snapshot,
without replaying toasts or reading storage. The application owns serialization, validation, safe display copy
and reconstruction of action/report callbacks or VNodes; raw rich notices are not a JSON storage contract.

Create a bus per application/account scope. Explicit retained categories opt into memory only; no browser
storage, durable persistence, account identification, network or automatic subscriptions are included.
Reset or dispose the scope on identity change. Late publishers must use the disposed old scope.

## Surfaces

`FeedbackToastHost` updates visible toasts by stable id; Close and expiry preserve retained history, while
Delete removes it. `NotificationCenterGroup` takes an explicit `bus` and renders retained rows independently
of whether the toast adapter was mounted. Default bus publication still uses `feedbackBus`/`notify`.

## Verification

Behavior: `tests/unit/feedback/RetainedFeedback.test.ts` and
`tests/unit/presentation/feedback/RetainedFeedback.dom.test.ts`.
