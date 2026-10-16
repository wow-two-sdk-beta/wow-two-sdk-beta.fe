# EventCalendarViewer

Renders a calendar in month, week, day, or agenda view, under a header of period controls.

Source: [EventCalendarViewer.vue](EventCalendarViewer.vue).

Public import: `import { EventCalendarViewer } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop          | Type                                      | Required | Default                              | Meaning                                                                                                                 |
| ------------- | ----------------------------------------- | -------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `events`      | `ReadonlyArray<EventCalendarViewerEvent>` | yes      | `() => []`                           | Declared by the source contract.                                                                                        |
| `view`        | `EventCalendarViewerView`                 | no       | —                                    | The visible range mode, controlled. The `v-model:view` binding target.                                                  |
| `defaultView` | `EventCalendarViewerView`                 | no       | `EventCalendarViewerViewValue.Month` | The initial view when uncontrolled.                                                                                     |
| `date`        | `Temporal.ZonedDateTime`                  | no       | —                                    | The focused instant, controlled; its calendar day drives the visible month/week/day. The `v-model:date` binding target. |
| `defaultDate` | `Temporal.ZonedDateTime`                  | no       | —                                    | The initial focused instant when uncontrolled. Defaults to now.                                                         |
| `weekStart`   | `0 \| 1`                                  | no       | `0`                                  | Declared by the source contract.                                                                                        |
| `hourRange`   | `[number, number]`                        | no       | `() => [0, 24]`                      | Declared by the source contract.                                                                                        |

## Event projection

The focused ZonedDateTime supplies the display zone. Events intersect displayed calendar days by
absolute time, with exclusive end instants; an event ending at midnight is absent the following day.
Zero-duration events appear on their start day; reversed intervals are ignored. Multi-day events
continue through each visible day. Agenda rows are chronological and use the same boundary rule.
`hourRange` uses integer hours from 0 through 24; 24 means next midnight. Invalid visual ranges use
`[0,24]`. Grid events clip to the visible interval and overlapping groups receive separate columns.
The grid uses wall-clock hours, with a minimum visual duration: DST repeated hours share the same
axis position. When a fold reverses the end clock, the block uses clipped elapsed duration; its end
position is an approximation on this 24-hour axis. Event labels/values retain their exact instants.
Day/hour slots are keyboard buttons; the view selector uses pressed buttons. LocaleProvider supplies
period/date labels, control labels and complete count messages.
Regression: `tests/unit/presentation/display/CalendarAndTable.dom.test.ts`.

## Emits

| Event         | Signature                                                 | Meaning                                                                                       |
| ------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `update:view` | `'update:view': [view: EventCalendarViewerView];`         | Fires when the reader switches view — the `v-model:view` half.                                |
| `update:date` | `'update:date': [date: Temporal.ZonedDateTime];`          | Fires when the focused date moves — the `v-model:date` half.                                  |
| `event-click` | `'event-click': [event: EventCalendarViewerEvent];`       | Fires when the reader clicks an event block, with that event.                                 |
| `slot-click`  | `'slot-click': [day: Temporal.PlainDate, hour?: number];` | Fires when the reader clicks an empty slot — `day` is the calendar day, `hour` the grid hour. |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
