# MonthView

Renders the month grid of an `EventCalendarViewer`.

Source: [MonthView.vue](MonthView.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.
- Weekday headers are `weekdayName` short names, rotated to start on `weekStart`; a bar's date range names its months through the viewer's date names. Where the runtime has no data for the locale (Chrome has none for Uzbek) the SDK's own names stand in.
- The grid is a weekday header and six week rows. Each row is one seven-column grid with explicit rows: dates first, then one row per bar lane, then the single-day chips, so a bar can span the days of its row.

## Multi-day bars

An event that touches more than one calendar day in `timeZone` is multi-day; every other event is a single-day chip in its day. The shared boundary rule applies: the end instant is exclusive, so an event ending at midnight leaves that day, and a zero-duration event stays on its start day.

- A multi-day event draws as one bar per week row it touches, clipped to the visible grid. A bar covers the columns of its days, starting at column `data-bar-column` (1-based) for `data-bar-span` columns, and carries its text once per row segment, truncated.
- Only the event's own first day starts a bar rounded (`data-bar-start`) and only its own last day ends one rounded (`data-bar-end`). An edge that continues past the row stays square and flush with the cell border; the corners are logical (`rounded-s` / `rounded-e`), so right-to-left grids round the right end.
- Lanes stack from the top of the row. Bars go in order of first day, longer first, and each takes the lowest lane whose bars end before it starts, so no two bars in one row and lane overlap. Lane numbers are per row (`data-bar-lane`, 0-based).
- From `sm` up, each bar segment is a `button` named by `MonthView.eventRange`: the title, then the event's whole date range, `Expo, Sep 9, 2026 – Sep 24, 2026`. Clicking one fires `event-click`, never `slot-click`.
- A bar uses the event's `color` with a readable text color, else the theme's soft primary tokens.

## Overflow

A day cell draws at most 4 items — bar lanes and single-day chips together. The drawn lanes are the row's lane count up to 4, in every column of the row, so the chips share what the lanes leave: with two lanes, two chips per day.

- A bar that needs a lane past the fourth is not drawn.
- `+N more` (`MonthView.more`) counts the hidden bars and chips. Activating it opens every event touching that day in a dialog.
- A row with no bars draws four chips, and the rest count into `+N more`.

## Phone layout

- Below `sm`, compact weeks reserve space for the dates and single-day event dots above the decorative multi-day bars. The whole date cell opens a bottom sheet. Its accessible name includes the event count.
- The sheet shows the date and matching event count, including ongoing multi-day events and items beyond the grid's display limit. Each event opens through `event-click`. Dismissing returns focus to the date.

## Props

| Prop        | Type                                      | Required | Default | Meaning                          |
| ----------- | ----------------------------------------- | -------- | ------- | -------------------------------- |
| `focusDay`  | `Temporal.PlainDate`                      | yes      | —       | Declared by the source contract. |
| `timeZone`  | `string`                                  | yes      | —       | Declared by the source contract. |
| `events`    | `ReadonlyArray<EventCalendarViewerEvent>` | yes      | —       | Declared by the source contract. |
| `weekStart` | `0 \| 1`                                  | yes      | —       | Declared by the source contract. |

## Emits

| Event         | Signature                                                 | Meaning                               |
| ------------- | --------------------------------------------------------- | ------------------------------------- |
| `event-click` | `'event-click': [event: EventCalendarViewerEvent];`       | Fires when an event block is clicked. |
| `slot-click`  | `'slot-click': [day: Temporal.PlainDate, hour?: number];` | Fires when a date button is clicked.  |

## Messages

| Key                           | Fallback                   | Meaning                                                    |
| ----------------------------- | -------------------------- | ---------------------------------------------------------- |
| `MonthView.eventRange`        | `{title}, {start} – {end}` | A bar segment's accessible name; the dates carry the year. |
| `MonthView.more`              | `+{count} more`            | The events a day holds beyond what fits.                   |
| `EventCalendarViewer.eventAt` | `{title} at {time}`        | A single-day chip's accessible name.                       |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Focused tests: [MonthViewBars.dom.test.ts](../../../../tests/unit/presentation/display/MonthViewBars.dom.test.ts) covers a three-week event's bar per row and column spans, rounded and square ends, lane assignment and reuse, the no-overlap invariant, single-day chips under the lanes, and the overflow counts. The bars' placement is read from `data-bar-*` attributes and the grid styles; the tests do not measure rendered pixels.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
