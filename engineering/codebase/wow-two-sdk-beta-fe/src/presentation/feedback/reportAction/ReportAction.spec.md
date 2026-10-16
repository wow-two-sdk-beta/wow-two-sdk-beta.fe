# ReportAction

Renders the one-click Report action a failure notice carries — Report → Sending… → Reported with the receipt's reference, or a Retry when delivery fails.

Source: [ReportAction.vue](ReportAction.vue).

Public import: `import { ReportAction } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- `send` is a captured incident's `send` from `/reporting`; the action never builds a report itself.
- One click sends once: clicks while sending or after delivery do nothing. A failed delivery offers Retry, which sends again.
- A different `send` function resets the action to idle, and the previous send settling late never changes the new state.
- Clicking focuses the button explicitly (Safari does not), so a hosting `ToastHost` pauses its expiry while the report is in flight. Once delivered the button stays focusable with `aria-disabled="true"`, keeping that pause until the user moves on.
- The adjacent `role="status"` region announces the outcome: the visually hidden `sentAnnouncement` plus the reference, or `failedText`.
- A GUID receipt id shows as its last eight hex digits, upper-cased (`toReference`) — a UUID v7's head is its timestamp; any other id shows as given.
- The whole action is `data-report-ignore`, so the click that files a report never lands on a click trail.
- `data-state` on the root reflects `ReportState`: `idle`, `sending`, `sent`, `failed`.

## Props

| Prop               | Type         | Required | Default          | Meaning                                                   |
| ------------------ | ------------ | -------- | ---------------- | --------------------------------------------------------- |
| `send`             | `ReportSend` | yes      | —                | Sends the report; a different function resets the action. |
| `label`            | `string`     | no       | `'Report'`       | The label before sending.                                 |
| `sendingLabel`     | `string`     | no       | `'Sending…'`     | The label while sending.                                  |
| `sentLabel`        | `string`     | no       | `'Reported'`     | The label once delivered.                                 |
| `retryLabel`       | `string`     | no       | `'Retry'`        | The label after a failed delivery.                        |
| `failedText`       | `string`     | no       | `"Couldn't send"` | The status after a failed delivery.                      |
| `referenceLabel`   | `string`     | no       | `'Ref'`          | The word before the delivered report's reference.         |
| `sentAnnouncement` | `string`     | no       | `'Report sent.'` | The visually hidden announcement preceding the reference. |

Every label reads the locale key `ReportAction.{prop}` before its fallback.

## Emits

| Event    | Signature                          | Meaning                        |
| -------- | ---------------------------------- | ------------------------------ |
| `sent`   | `sent: [receipt: ReportReceipt];`  | Fires when the report arrives. |
| `failed` | `failed: [error: unknown];`        | Fires when delivery fails.     |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Behaviour: [ReportAction.dom.test.ts](../../../../tests/unit/presentation/feedback/ReportAction.dom.test.ts).
- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts).
