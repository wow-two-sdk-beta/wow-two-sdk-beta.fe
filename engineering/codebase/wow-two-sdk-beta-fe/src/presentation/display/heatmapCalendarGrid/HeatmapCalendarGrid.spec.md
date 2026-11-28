# HeatmapCalendarGrid

Renders per-day activity as week columns over weekday rows, month labels above, one button per day.

Source: [HeatmapCalendarGrid.vue](HeatmapCalendarGrid.vue).

Public import: `import { HeatmapCalendarGrid } from '@wow-two-beta/fe/presentation/display';` (also from the
package root, `@wow-two-beta/fe`).

## Contract

- The caller computes every day: its tone, level, mark, split and label. The grid holds no domain rule — no count
  bucketing, no tone choice, no label wording beyond the date of a day the caller left out.
- `selected` is the chosen day. Supplied at mount (a date or `null`), it is controlled: a click emits `select` and only
  the prop moves the ring. Omitted, the grid keeps its own choice and still emits `select`.
- Automatic attribute inheritance is disabled. `class` merges onto the root through `cn`; `aria-label` names the day
  group instead of the root; every other attribute lands on the root.
- It paints for a `card` surface: the sticky weekday column and the chosen ring's offset are `card`.

## Anatomy

```
<div root>
  ├── <div scroller>                 overflow-x auto, opens scrolled to the newest week
  │    └── <div role="group">        CSS grid: weekday column + one column per week
  │         ├── month labels         row 1, over the first column holding the 1st of a month
  │         ├── weekday labels       column 1, sticky, every other row
  │         └── <button data-date>   one per day: fill, split?, mark?, today ring or dot?
  └── Portal → tooltip               one, teleported to <body>, anchored to the shown day
</div>
```

## Layout

- The range runs from `from` to `to`, both included; reversed bounds are swapped. A column is a week starting on
  `weekStart`; the first and last columns may be partial.
- Cells are 22px with 3px gaps below `md`, 20px with 4px gaps from `md` (`--heatmap-cell`). The grid takes only the
  width it needs and scrolls sideways inside its root; on mount and whenever the week count changes it scrolls to the
  newest week (the mirrored end under `rtl`).
- A month label sits over the column holding that month's 1st (the range's first column for the first month) and
  spans up to three columns. A label fewer than three columns before the next gives way to it.
- Weekday labels show on rows 1, 3, 5 and 7 (Mon, Wed, Fri, Sun under the default Monday start).

## Cells

`HeatmapCalendarGridCell` is `{ date, tone?, level?, mark?, split?, label }`.

| Field | Type | Meaning |
|---|---|---|
| `date` | `Temporal.PlainDate` | The day. A cell outside the range is ignored; a later cell for the same day wins. |
| `tone` | `'success' \| 'warning' \| 'danger'` | The fill tone. Omitted, the day reads empty (`bg-muted`). |
| `level` | `0 \| 1 \| 2 \| 3 \| 4` | The fill step. Default `0`, the empty fill whatever the tone. |
| `mark` | `'half' \| 'cross'` | The inner mark, so colour is never the only signal. |
| `split` | `'success' \| 'warning' \| 'danger'` | The tone of the lower-right half at the same level, for a mixed day. |
| `label` | `string` | The tooltip text and the day's accessible name. |

- A range day without a cell is empty and named by its date (`Wed, Nov 4, 2026`, in the active locale).
- `HeatmapCalendarGridFills[tone][level]` is the fill class; a caller's key reads it so the two never drift.

| Tone | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| `success` | `bg-success/30` | `bg-success/55` | `bg-success/80` | `bg-success` |
| `warning` | `bg-warning/35` | `bg-warning/60` | `bg-warning/85` | `bg-warning` |
| `danger` | `bg-destructive/30` | `bg-destructive/55` | `bg-destructive/80` | `bg-destructive` |

- A mark stays readable on its fill in both themes: levels 3–4 take the tone's foreground at 90%; level 2 takes
  `text-foreground/65`, and the tone's foreground in the dark theme; levels 0–1 and a toneless day take
  `text-foreground/65`.

## Today and the chosen day

| State | Visual | Semantics |
|---|---|---|
| today | a dashed 1.5px `muted-foreground` ring, outset 1.5px | `aria-current="date"` |
| today, `isLive` | the ring pulses; it holds still under `prefers-reduced-motion` | — |
| chosen | a solid 2px `primary` ring, offset 1px from the cell | `aria-pressed="true"` |
| chosen today | the chosen ring, plus a 7px `foreground` dot on the top end corner (pulsing while live) | both |
| focused | a 2px `primary` outline, offset 1px (`:focus-visible`) | — |

`today` defaults to the current ISO date in the runtime's time zone; pass it for a fixed clock or another zone.

## Interaction

- A click toggles a day: `select` carries that day, or `null` when it was already the chosen one.
- One day holds the tab stop (roving `tabindex`): the day last moved to or clicked, else the chosen day, else today
  when in range, else the last day.
- ArrowLeft and ArrowRight move a week, ArrowUp and ArrowDown a day, Home and End to the range's first and last day.
  A move past the range stays put. Under `rtl` (`DirectionProvider`) the sideways arrows are mirrored.
- One shared tooltip shows the day's `label`: on hover by a mouse or pen, on keyboard focus, and on a tap. It is
  teleported to `<body>` at `z-tooltip`, placed above the day, flipped below when there is no room and shifted to
  stay 8px inside the viewport; it follows the day through scrolling and resizing.
- It hides when the pointer leaves, on blur, on Escape (focus stays) and on a press outside the grid.

## Touch

Under a coarse pointer (a finger) at one viewport size, against a fine one (a mouse):

| Element | Touch change | Kind |
|---|---|---|
| day cells | none: an invisible hit area (`CoarseHitArea.After`) grows each side by half the gap (`--coarse-hit-gap`), so neighbours never share a tap; cells keep 22px below `md` | hit area |
| tooltip | shown by a tap, which also toggles the day; a finger passing over shows nothing | behavior |

A 44px reach does not fit a 22px cell with a 3px gap without overlapping its neighbours; the declared cell size wins.

## Accessibility

- The days sit in `role="group"`, named by the caller's `aria-label` or `Activity per day, {from} to {to}`
  (message key `HeatmapCalendarGrid.label`).
- Each day is a `<button>` named by its label; month and weekday labels, marks, split and rings are `aria-hidden`.
- Under `forced-colors` each cell keeps its authored colours (`forced-color-adjust: none`), so fills, marks and rings
  stay legible as data.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `cells` | `ReadonlyArray<HeatmapCalendarGridCell>` | yes | `() => []` | The days that carry activity. Absent, the range draws empty (Vue still warns). |
| `from` | `Temporal.PlainDate` | no | the day after the same date a year before `to` | The first day drawn. |
| `to` | `Temporal.PlainDate` | no | `today` | The last day drawn. |
| `today` | `Temporal.PlainDate` | no | the current ISO date | The day that wears the today ring. |
| `selected` | `Temporal.PlainDate \| null` | no | `undefined` (uncontrolled) | The chosen day; `null` chooses none. |
| `isLive` | `boolean` | no | `false` | Today's ring or dot pulses. |
| `weekStart` | `0 \| 1` | no | `1` | The first weekday of a column — `0` Sunday, `1` Monday. |
| `monthLabels` | `ReadonlyArray<string>` | no | the locale's short month names | The 12 month labels, January first. |
| `weekdayLabels` | `ReadonlyArray<string>` | no | the locale's short weekday names | The 7 weekday labels, Sunday first. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [date: Temporal.PlainDate \| null]` | Fires when the reader toggles a day. |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while
unmounted.

## Exports

`HeatmapCalendarGrid`, `HeatmapCalendarGridTone`, `HeatmapCalendarGridMark`, `HeatmapCalendarGridLevels`,
`HeatmapCalendarGridFills`, and the types `HeatmapCalendarGridProps`, `HeatmapCalendarGridCell`,
`HeatmapCalendarGridLevel`.

## Non-goals

- No legend under the grid: the key belongs to the caller, built from `HeatmapCalendarGridFills`.
- No count bucketing, tone or label rules; the caller's domain owns them.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts).
  This covers render/SSR compatibility, not all interaction behavior.
- Focused tests: [HeatmapCalendarGrid.dom.test.ts](../../../../tests/unit/presentation/display/HeatmapCalendarGrid.dom.test.ts)
  (layout, cells, today and chosen rings, selection, keyboard, tooltip, tap),
  [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts)
  and [Localization.dom.test.ts](../../../../tests/unit/presentation/display/Localization.dom.test.ts).
- Not yet browser-verified: real tooltip placement at the viewport edge, the coarse-pointer hit area, the md cell
  sizes, the newest-week scroll and forced colors.
