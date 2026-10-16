# RelativeTime

Renders a `<time datetime>` reading as a relative distance, with the absolute time in a tooltip and an optional
live tick.

Source: [RelativeTime.vue](RelativeTime.vue).

Public import: `import { RelativeTime } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- `value` takes a `Date`, epoch milliseconds or an ISO-8601 string; `datetime` carries it as ISO-8601.
- The text picks the largest unit that keeps the distance at least one ("3 days ago", "in 2 hours"), formatted
  through the active locale's `Intl.RelativeTimeFormat`; `numeric: 'auto'` words near distances ("yesterday").
- The tooltip shows the absolute time in the active locale on hover; the element takes no tab stop.
- `isLive` re-renders on a timer that slows as the distance grows (5 s under a minute, 30 s under an hour, 5 min
  under a day, hourly beyond); a fixed `now` or an unreadable value stops it. Unmounting clears the timer.
- The server and the first client render use the clock at render; pass `now` for a deterministic label.
- An unreadable value renders an empty `<time>` without `datetime` or tooltip.
- Automatic attribute inheritance is disabled; attributes and `class` reach the `<time>` element.

## Props

| Prop             | Type                            | Required | Default                 | Meaning                                    |
| ---------------- | ------------------------------- | -------- | ----------------------- | ------------------------------------------ |
| `value`          | `Date \| number \| string`      | yes      | —                       | The instant.                               |
| `isLive`         | `boolean`                       | no       | `false`                 | Re-renders as time passes.                 |
| `now`            | `Date \| number`                | no       | the clock               | The instant the distance is measured from. |
| `numeric`        | `'always' \| 'auto'`            | no       | `auto`                  | Words near distances, or keeps numbers.    |
| `unitDisplay`    | `'long' \| 'short' \| 'narrow'` | no       | `long`                  | The unit wording length.                   |
| `absoluteFormat` | `Intl.DateTimeFormatOptions`    | no       | medium date, short time | The tooltip format.                        |
| `hasTooltip`     | `boolean`                       | no       | `true`                  | Shows the absolute time on hover.          |

## Emits

None declared.

## Slots

None.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts).
- Focused test references: [RelativeTime.dom.test.ts](../../../../tests/unit/presentation/display/RelativeTime.dom.test.ts),
  [RelativeTimeParts.test.ts](../../../../tests/unit/foundation/i18n/RelativeTimeParts.test.ts).
