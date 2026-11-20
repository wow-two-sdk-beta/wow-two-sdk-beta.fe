# YearView

Renders the year of twelve mini months of an `EventCalendarViewer`.

Source: [YearView.vue](YearView.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.
- The year is the year of `focusDay`. Months render January first in a responsive grid: one column below `sm`, two from `sm`, three from `md`, four from `lg`.
- Each mini month is a `group` named by its month and year. It holds a month-name button, a count of the events touching that month, weekday initials in `weekStart` order and day buttons. Every mini month is six week rows tall, so the grid stays aligned.
- A day button's accessible name is its full date, followed by the event count when the day has events (`Thursday, March 5, 2026, 2 events`). A marked day also carries the count as its `title`.
- Month names come from `monthName` (long), weekday initials from `weekdayName` (narrow, Monday first by ISO number and rotated by `weekStart`), the group label from `formatMonthYear`, and a day's date from the viewer's date names, so a runtime with no data for the locale still reads Uzbek words. Numbers and the date's pattern stay `Intl`'s.

## Event projection

- Events project onto days in `timeZone` with the viewer's boundary rule: an exclusive end instant, zero-duration events on their start day, reversed intervals ignored.
- A multi-day event marks every day it spans, clipped to the displayed year. An event wholly outside the year marks nothing.
- The month count is the number of distinct events touching that month, so an event spanning several days counts once.
- A marked day gets a tinted wash of its first event's `color`, in the order `events` arrives. The color travels in the `--year-day-tint` custom property; a day whose first event has no `color` washes with the primary token. Marked days also read bold, and take a border under forced colors.
- Today carries `aria-current="date"`, `data-today` and a primary ring.

## Props

| Prop        | Type                                      | Required | Default | Meaning                                                    |
| ----------- | ----------------------------------------- | -------- | ------- | ---------------------------------------------------------- |
| `focusDay`  | `Temporal.PlainDate`                      | yes      | —       | A day of the year to render.                               |
| `timeZone`  | `string`                                  | yes      | —       | The zone events project into.                              |
| `events`    | `ReadonlyArray<EventCalendarViewerEvent>` | yes      | —       | The events to mark; order decides which color tints a day. |
| `weekStart` | `0 \| 1`                                  | yes      | —       | The first weekday of a mini month's rows.                  |

## Emits

| Event         | Signature                                     | Meaning                                                               |
| ------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `month-click` | `'month-click': [month: Temporal.PlainDate];` | Fires when a month name is clicked, with the first day of that month. |
| `day-click`   | `'day-click': [day: Temporal.PlainDate];`     | Fires when a day button is clicked, with that day.                    |

## Messages

| Key                  | Fallback           | Meaning                                                    |
| -------------------- | ------------------ | ---------------------------------------------------------- |
| `YearView.events`    | `{count} events`   | The count of events, for every plural but one.             |
| `YearView.eventsOne` | `{count} event`    | The count of events when `Intl.PluralRules` selects `one`. |
| `YearView.dayLabel`  | `{date}, {events}` | A marked day's accessible name.                            |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Exercised through its owning family: [EventCalendarViewerViews.dom.test.ts](../../../../tests/unit/presentation/display/EventCalendarViewerViews.dom.test.ts) covers the twelve months, multi-day marking, year-edge clipping, the exclusive end, counts, tint, today, `weekStart`, locale names, and the month and day clicks.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
