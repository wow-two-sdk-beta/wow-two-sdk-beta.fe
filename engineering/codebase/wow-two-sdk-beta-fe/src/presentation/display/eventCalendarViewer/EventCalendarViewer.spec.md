# EventCalendarViewer

Renders a calendar in day, week, month, year, or agenda view, under a header of period controls.

Source: [EventCalendarViewer.vue](EventCalendarViewer.vue).

Public import: `import { EventCalendarViewer } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop          | Type                                      | Required | Default                               | Meaning                                                                                                                 |
| ------------- | ----------------------------------------- | -------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `events`      | `ReadonlyArray<EventCalendarViewerEvent>` | yes      | `() => []`                            | Declared by the source contract.                                                                                        |
| `view`        | `EventCalendarViewerView`                 | no       | —                                     | The visible range mode, controlled. The `v-model:view` binding target.                                                  |
| `defaultView` | `EventCalendarViewerView`                 | no       | `EventCalendarViewerViewValue.Month`  | The initial view when uncontrolled.                                                                                     |
| `date`        | `Temporal.ZonedDateTime`                  | no       | —                                     | The focused instant, controlled; its calendar day drives the visible month/week/day. The `v-model:date` binding target. |
| `defaultDate` | `Temporal.ZonedDateTime`                  | no       | —                                     | The initial focused instant when uncontrolled. Defaults to now.                                                         |
| `weekStart`   | `0 \| 1`                                  | no       | `0`                                   | Declared by the source contract.                                                                                        |
| `hourRange`   | `[number, number]`                        | no       | `() => [0, 24]`                       | Declared by the source contract.                                                                                        |
| `views`       | `ReadonlyArray<EventCalendarViewerView>`  | no       | `() => [...EventCalendarViewerViews]` | The views the switcher offers, shown in canonical order whatever order is passed. Defaults to all five.                 |

## Views

`EventCalendarViewerView` is `day`, `week`, `month`, `year` or `agenda`. The switcher lists the offered
views in that canonical order, whatever order `views` is passed in; `month` is the default view.

- `views` filters the switcher. A repeated or unknown entry is ignored, and an empty list offers every view.
- A current view that is not offered — the controlled `view`, or the `defaultView` — shows the first offered
  view instead. The viewer does not emit `update:view` for that fallback, since the reader changed nothing.
- Only one offered view hides the switcher and shows that view.
- The segmented toggle highlights the active view and dims the other choices. Pressing the active view keeps it selected.
- Prev, Next and the title follow the shown view: a year, month, week or day per step, and the agenda steps a day.
- Previous and Next flank the period title. Below `sm`, the view switcher uses its own row.
- The header's controls (Today, Previous, Next and the view switcher) are 44px tall below `sm` and 28px from it, and
  reach 44 x 44px under a coarse pointer at any width: Today and the switcher grow to 44px tall, and Previous and
  Next keep their box and take the tap across an invisible 44px square (`CoarseHitArea`), so the title stays put.
- The views serve their phone layout (dots instead of chips, a day list instead of a time grid) when the device class
  an app root provided with `provideDeviceTargets` is phone, whatever the viewport; without a provider, below `sm`.
  The reading is `false` — the wide layout — on the server and in the first render, and corrects on mount.
- Today is disabled in the current day, week, month or year in the display zone. In Agenda it is disabled when the list starts today.

### Year view

The focused date's year renders as twelve mini months ([YearView.spec.md](YearView.spec.md)) in a grid of one
column, two from `sm`, three from `md` and four from `lg`. The header title is the year as a locale-formatted number;
Prev and Next move the focused date by one year, and Today returns to the current day.

- A month name opens the month view on that month: emits `update:date` with the first of that month, then
  `update:view` with `month`.
- A day opens the day view on that day: emits `update:date` with that day, then `update:view` with `day`, and
  `slot-click` with the day.
- Both keep the focused instant's time of day and zone. A target view that `views` does not offer is not
  entered: the focused date still moves and `slot-click` still fires, and the year view stays.

## Event projection

The focused ZonedDateTime supplies the display zone. Events intersect displayed calendar days by
absolute time, with exclusive end instants; an event ending at midnight is absent the following day.
Zero-duration events appear on their start day; reversed intervals are ignored. Multi-day events
continue through each visible day of the week, day and year views; the month view draws one continuous bar
per week row instead ([MonthView.spec.md](MonthView.spec.md)). Agenda rows are chronological and use the same
boundary rule.
`hourRange` uses integer hours from 0 through 24; 24 means next midnight. Invalid visual ranges use
`[0,24]`. Grid events clip to the visible interval and overlapping groups receive separate columns.
The grid uses wall-clock hours, with a minimum visual duration: DST repeated hours share the same
axis position. When a fold reverses the end clock, the block uses clipped elapsed duration; its end
position is an approximation on this 24-hour axis. Event labels/values retain their exact instants.
Day/hour slots are keyboard buttons; the view selector uses pressed buttons. LocaleProvider supplies
period/date labels, control labels and complete count messages.
Month and weekday names come from the SDK's date names (`monthName`, `weekdayName`, `formatMonthYear` from
`foundation/i18n`): the month title, the week and day titles' month words, the month grid's weekday headers, the
time grid's weekday headers, the year view's month names and weekday initials, and the agenda's headings. A runtime
with no data for the locale — Chrome has none for Uzbek — still reads Uzbek words (`noyabr 2026`, `Ya`, `Du`)
instead of `M11` or English. The date's pattern, its numbers and a year-only title stay `Intl`'s, and a locale the
runtime does have is written as `Intl` writes it, genitive months included. The shared helper is
[EventCalendarViewerDates.ts](EventCalendarViewerDates.ts).
The year view marks every day an event spans, clipped to the displayed year, with the same boundary rule.
Regression: `tests/unit/presentation/display/CalendarAndTable.dom.test.ts` and
`tests/unit/presentation/display/EventCalendarViewerViews.dom.test.ts`.

## Emits

| Event         | Signature                                                 | Meaning                                                                                                                                     |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `update:view` | `'update:view': [view: EventCalendarViewerView];`         | Fires when the reader switches view — the `v-model:view` half.                                                                              |
| `update:date` | `'update:date': [date: Temporal.ZonedDateTime];`          | Fires when the focused date moves — the `v-model:date` half.                                                                                |
| `event-click` | `'event-click': [event: EventCalendarViewerEvent];`       | Fires when the reader clicks an event block, with that event.                                                                               |
| `slot-click`  | `'slot-click': [day: Temporal.PlainDate, hour?: number];` | Fires when the reader clicks an empty slot — `day` is the calendar day, `hour` the grid hour. A year-view day click fires it with that day. |

## Slots

| Slot            | Meaning                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toolbar-extra` | Extra controls shown in the header between the title and the view switcher. Renders only when the consumer fills it. At `lg` (1024px) and up it shares the row and control height with Today and the switcher; below `lg` it is its own full-width row, between the title row and the switcher row. Unfilled, the header is byte-for-byte unchanged (the wrap breakpoint stays `sm`). |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts), [EventCalendarViewerViews.dom.test.ts](../../../../tests/unit/presentation/display/EventCalendarViewerViews.dom.test.ts) (the year view, the `views` prop and each view's navigation). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
