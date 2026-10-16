# ErrorBoundary

Renders its subtree until a descendant throws while rendering, then renders a fallback with a retry.

Source: [ErrorBoundary.vue](ErrorBoundary.vue).

Public import: `import { ErrorBoundary } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Captures, through `onErrorCaptured`, what a descendant throws while setting up, rendering, updating, or running a lifecycle hook or watcher; that error swaps the subtree for the fallback and stops propagating.
- A descendant's event-handler error — sync or a rejected async handler — only emits `error` and keeps propagating to the app handler; the subtree stays rendered, as React boundaries do.
- Retry clears the error, which remounts the subtree from scratch. A change in any `resetKeys` value clears a caught error the same way.
- The nearest boundary owns a failure; outer boundaries never see a failure an inner one caught.
- Route-level failures and navigation errors belong to the router's `AppErrorBoundary`.
- Attributes and `class` reach the built-in fallback only.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `resetKeys` | `ReadonlyArray<unknown>` | no | `[]` | Values that clear a caught error when any of them changes. |
| `title` | `string` | no | `"Something went wrong"` | The built-in fallback heading; localized `ErrorBoundary.title`. |
| `retryLabel` | `string` | no | `"Try again"` | The built-in retry text; localized `ErrorBoundary.retryLabel`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `error` | `error: [error: unknown, info: string];` | Fires for every error a descendant throws, with Vue's error-info tag. |
| `reset` | `reset: [];` | Fires when a caught error clears. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The guarded subtree. |
| `fallback` | `fallback?(props: { error: unknown; reset: () => void }): unknown` | Replaces the built-in fallback. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts).
- Focused tests: [ErrorBoundary.dom.test.ts](../../../../tests/unit/presentation/feedback/ErrorBoundary.dom.test.ts) — render and setup capture, handler pass-through, reset keys, custom fallback, nesting and localization.

## Interaction guarantees

The built-in fallback is a `role="alert"` region, so the failure is announced without moving focus; its retry is a `<button>`.
