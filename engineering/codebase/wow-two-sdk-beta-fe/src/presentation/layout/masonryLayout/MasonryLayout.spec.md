# MasonryLayout

Renders children as masonry — items of uneven height flow down balanced columns with no row gaps.

Source: [MasonryLayout.vue](MasonryLayout.vue).

Public import: `import { MasonryLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- The arrangement is CSS multi-column: items keep source order down each column, then across. Reading and tab order follow the source, not the visual rows.
- `columns` is the count, or the most columns when `minColumnWidth` is set (`columns: <width> <count>`), so a narrow container drops columns with no script.
- `gap` spaces the columns and repeats below every item except the last; items never split across columns.
- A `columns` value that is not finite falls back to 3; others round to the nearest whole number, at least 1.
- Attributes and `class` reach the root; `data-columns` carries the resolved count.

## Props

| Prop             | Type     | Required | Default  | Meaning                                                      |
| ---------------- | -------- | -------- | -------- | ------------------------------------------------------------ |
| `columns`        | `number` | no       | `3`      | The column count, or the most columns with `minColumnWidth`. |
| `minColumnWidth` | `string` | no       | —        | The narrowest a column may get, as a CSS length.             |
| `gap`            | `string` | no       | `'1rem'` | The gap between columns and between stacked items.           |

## Emits

None.

## Slots

| Slot      | Signature            | Meaning                                                     |
| --------- | -------------------- | ----------------------------------------------------------- |
| `default` | `default(): unknown` | The items; each direct child stays whole within one column. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts).
- Focused tests: [MasonryLayout.dom.test.ts](../../../../tests/unit/presentation/layout/MasonryLayout.dom.test.ts) — column style, gap variable and count clamping.
