# CountdownText

Renders the time left until a target instant as ticking text, and reports when it reaches zero.

Source: [CountdownText.vue](CountdownText.vue).

Public import: `import { CountdownText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- `to` takes a `Temporal.Instant` or epoch milliseconds; a non-finite target counts as reached.
- The text reads the real clock on every tick, scheduled on whole-second boundaries, so a throttled background tab shows the right value when it wakes.
- Seconds round up, so the text shows `00:00` exactly when the target passes.
- `complete` fires once per target — at zero, or on mount when the target already passed. A new target restarts ticking.
- `isPaused` stops ticking and holds the text; resuming recomputes from the clock.
- Ticking starts on mount; server rendering shows the value at render time and never schedules a timer.
- Attributes and `class` reach the `<time>` root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `to` | `Temporal.Instant \| number` | yes | — | The moment the countdown reaches zero. |
| `isPaused` | `boolean` | no | `false` | Stops ticking and holds the text. |
| `format` | `(parts: CountdownParts) => string` | no | clock | The text; default `02:03`, `1:02:03`, or `2d 01:02:03` with the localized `CountdownText.days` part. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `complete` | `complete: [];` | Fires once when the countdown reaches zero. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(props: { parts: CountdownParts; text: string }): unknown` | Replaces the text, for a segmented display. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts).
- Focused tests: [TextAndTimers.dom.test.ts](../../../../tests/unit/presentation/display/TextAndTimers.dom.test.ts) — ticking, completion, clock formats, pause, restart, slots and localization under fake timers.

## Interaction guarantees

The root is `<time role="timer" aria-atomic="true">` with an ISO 8601 duration in `datetime` (`PT1H2M5S`). A timer role is not announced on each tick; pair it with a live region when the change must be spoken.
