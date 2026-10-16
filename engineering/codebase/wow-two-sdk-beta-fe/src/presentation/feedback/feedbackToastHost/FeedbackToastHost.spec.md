# FeedbackToastHost

Renders the toast viewport and forwards every `/feedback` bus notice into `toastHost.toast()`.

Source: [FeedbackToastHost.vue](FeedbackToastHost.vue).

Public import: `import { FeedbackToastHost } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- A stable notice `id` updates its existing visible toast and refreshes its timer rather than stacking duplicates.
- Retained notices expose Delete and Close icons: Delete calls `bus.remove(id)`; Close and expiration only hide the toast.
- Bus reset/disposal closes this adapter's toasts without dismissing another publisher's toasts. Swapping the bus and unmounting clean up owned subscriptions and toasts, without deleting retained history.
- Retained history is replayed by `NotificationCenterGroup`, never replayed as a toast on mount.
- Each notice becomes one toast: `tone` → `severity`, `durationMs` → `duration`, and `title`, `description`, `action` and `report` pass through — a notice carrying `report` shows the one-click Report action.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ ToastHostProps`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `bus` | `FeedbackBus` | no | — | The bus to render. Default: the app-wide `feedbackBus` singleton (what `notify()` publishes on). |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
