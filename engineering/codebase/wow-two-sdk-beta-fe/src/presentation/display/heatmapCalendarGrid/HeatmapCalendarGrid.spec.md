# HeatmapCalendarGrid

Renders a year-long heatmap — 53 week columns x 7 weekday rows, tinted per day.

Source: [HeatmapCalendarGrid.vue](HeatmapCalendarGrid.vue).

Public import: `import { HeatmapCalendarGrid } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `values` | `Map<Temporal.PlainDate, number>` | yes | `() => new Map<Temporal.PlainDate, number>()` | The per-day counts, keyed by calendar date. |
| `year` | `number` | no | `undefined` | The rendered calendar year. Defaults to the current ISO year. |
| `weekStart` | `0 \| 1` | no | `0` | The first weekday of a column — `0` Sunday, `1` Monday. Default `0`. |
| `cellSize` | `number` | no | `12` | The cell edge length in px. Default `12`. |
| `gap` | `number` | no | `2` | The gap between cells in px. Default `2`. |
| `levels` | `number` | no | `5` | The intensity buckets (min 2, clamped). Default 5. Buckets map proportionally onto the fixed 5-step tone palette, so buckets past 5 share palette classes. |
| `tone` | `HeatmapCalendarGridTone` | no | `'brand'` | The color ramp tone. Default `brand`. |
| `onCellClick` | `(date: Temporal.PlainDate, value: number) => void` | no | `undefined` | Fires with the clicked day and its value. Kept a prop rather than an emit because its *presence* is load-bearing — it decides whether an in-year cell renders as a `<button>` or an inert `<div>`, and Vue strips declared emit listeners out of `useAttrs()`. |
| `monthLabels` | `ReadonlyArray<string>` | no | `() => DefaultMonths` | The 12 month labels, January first. |
| `weekdayLabels` | `ReadonlyArray<string>` | no | `() => DefaultWeekdays` | The 7 weekday labels, Sunday first. |
| `hasLegend` | `boolean` | no | `true` | The legend state. Default `true`. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
