# PeriodGrid

Renders one page of months or years — period nav and a keyboard-navigable 3 × 4 cell grid.

Source: [PeriodGrid.vue](PeriodGrid.vue).

Internal implementation: composed by [PeriodPicker.vue](PeriodPicker.vue) for `MonthPicker` and `YearPicker`.

## Contract

- Works in index space ([PeriodExtensions.ts](PeriodExtensions.ts)): a month is `year × 12 + month − 1`, a year is itself, so neighbouring cells differ by one.
- A month page is one year (January–December). A year page is one decade framed by the years either side, marked `data-outside`; picking an outside year turns the page to it.
- The focused index owns the page and starts at `initialIndex`, clamped into `min`/`max`. The page buttons turn a page without moving DOM focus and disable once the next page holds nothing in range.
- Keyboard: arrows move one cell or one row (3 cells) and cross page edges; Home/End reach the row edges; PageUp/PageDown turn a page, ten with Shift; Enter/Space pick. Moves skip disabled cells and hold at the range edge.
- One roving tab stop: the focused cell, or the first enabled cell on the page when it is disabled. Mounted inside an open popover, focus moves from the first tabbable onto that cell.
- Month cells show the short month and are named with the long month and year. The grid is named by the page heading, which is a polite live region.
- Localized labels: `PeriodGrid.previousYear` / `nextYear` (months) and `PeriodGrid.previousDecade` / `nextDecade` (years).

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `kind` | `PeriodKind` | yes | — | `'month'` or `'year'`. |
| `selectedIndex` | `number \| null` | no | `null` | The picked cell's index. |
| `initialIndex` | `number` | yes | — | The index focused at mount. |
| `min` | `number \| null` | no | `null` | The lowest selectable index. |
| `max` | `number \| null` | no | `null` | The highest selectable index. |
| `isIndexDisabled` | `(index: number) => boolean` | no | — | The custom per-cell disable predicate. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `activate` | `activate: [index: number];` | Fires when the reader picks an enabled cell. |

## Slots

None declared.

## Exposed handle

`{ el }` — the root element.

## Verification

- Exercised through [PeriodPickers.dom.test.ts](../../../tests/unit/presentation/forms/PeriodPickers.dom.test.ts) — paging, outside years, keyboard moves, range edges and page-button state.
