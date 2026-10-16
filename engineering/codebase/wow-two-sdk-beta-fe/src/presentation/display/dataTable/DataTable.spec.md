# DataTable

Renders a sortable table from a `columns` descriptor, wrapping the `Table` primitives.

Source: [DataTable.vue](DataTable.vue).

Public import: `import { DataTable } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.
- Inside a `DataRegion` first load, or while an empty table has `isLoading`, the body draws `skeletonRows` rows
  within the real columns: one text bar per cell at the cell's line height and alignment, a skeleton checkbox in the
  selection column and the expand control's box. The heading stays as it is. `DataTableColumn.skeletonWidth` sets a
  column's bar width; the default varies per row and column.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `columns` | `ReadonlyArray<DataTableColumn<T>>` | yes | — | Declared by the source contract. |
| `data` | `ReadonlyArray<T>` | yes | — | Declared by the source contract. |
| `rowKey` | `(row: T, index: number) => string \| number` | no | `undefined` | Declared by the source contract. |
| `onRowClick` | `(row: T, index: number) => void` | no | `undefined` | Fires with the clicked row and its index. Kept a prop rather than an emit because its *presence* is load-bearing — it seeds `isHoverable` and the `cursor-pointer` class, and Vue strips declared emit listeners out of `useAttrs()`. |
| `sortBy` | `DataTableSort \| null` | no | `undefined` | Declared by the source contract. |
| `defaultSortBy` | `DataTableSort \| null` | no | `undefined` | Declared by the source contract. |
| `isStriped` | `boolean` | no | `undefined` | Declared by the source contract. |
| `isHoverable` | `boolean` | no | `undefined` | Declared by the source contract. |
| `density` | `TableDensity` | no | `undefined` | Declared by the source contract. |
| `isBare` | `boolean` | no | `undefined` | Declared by the source contract. |
| `emptyContent` | `string \| number` | no | `'No results.'` | The empty-state text. Default `No results.`; override richly via the `emptyContent` slot. |
| `selectionMode` | `SelectionMode` | no | `'none'` | `single` or `multiple` adds a checkbox column; `multiple` adds select-all. |
| `selection` | `ReadonlyArray<SelectionKey>` | no | `undefined` | The selected row keys, controlled. The `v-model:selection` binding target. |
| `defaultSelection` | `ReadonlyArray<SelectionKey>` | no | `[]` | The initially selected row keys when uncontrolled. |
| `isRowSelectable` | `(row: T, index: number) => boolean` | no | every row | Whether a row can be selected, given its data index. |
| `expanded` | `ReadonlyArray<SelectionKey>` | no | `undefined` | The expanded row keys, controlled. The `v-model:expanded` binding target. |
| `defaultExpanded` | `ReadonlyArray<SelectionKey>` | no | `[]` | The initially expanded row keys when uncontrolled. |
| `isRowExpandable` | `(row: T, index: number) => boolean` | no | every row | Whether a row can expand when the `expanded` slot is set. |
| `hasStickyHeader` | `boolean` | no | `false` | Pins the header while the body scrolls inside the container. |
| `isLoading` | `boolean` | no | `false` | Marks the table busy; an empty table draws skeleton rows instead of the empty state. |
| `skeletonRows` | `number` | no | `5` | The skeleton rows drawn while an empty table loads or its `DataRegion` first-loads. |
| `loadingRowCount` | `number` | no | `undefined` | Deprecated alias of `skeletonRows`; removed next release. |
| `containerClassName` | `string` | no | `undefined` | Classes for the scroll container; a height such as `max-h-96` lets the sticky header pin. |
| `phoneLayout` | `TablePhoneLayout` | no | `stack` | Below `stackBreakpoint`: `stack` (a card per row) or `scroll` (the table, scrolling sideways). |
| `stackBreakpoint` | `Breakpoint` | no | `md` | Rows stack into cards below this breakpoint. |

## Column sorting and row interaction

`DataTableColumn<T>.compare?: (left: T, right: T) => number` supplies a typed row comparator and
works without an accessor. Otherwise each accessor runs once per row per sort; ExactNumber and bigint
values compare numerically without conversion to native number. Strings use the active locale.
Rows with `onRowClick` are keyboard focusable and activate through Enter/Space. Nested controls retain
their own keyboard behavior. Supply a stable `rowKey` for rows that reorder.
Regression: `tests/unit/presentation/display/CalendarAndTable.dom.test.ts`.

## Column renderers

`DataTableColumn<T>.cell?: (row: T, index: number) => unknown` is one column's rich override: a VNode
(`h(Badge, …)`) or an array of VNodes mounts as markup, and any other value renders as its display string,
like an accessor's. The `cell` scoped slot replaces every column at once.
Regression: `tests/unit/presentation/display/DataTableDepth.dom.test.ts`.

## Selection, expansion and loading

- Row keys come from `rowKey(row, dataIndex)`, or the data index without one; sorting never changes a key.
- Selection uses `foundation/selection`: select-all and Shift ranges cover the selectable rows in display order.
- A declined controlled selection or expansion leaves the rendered state unchanged.
- The checkbox and expand cells are row controls: they never trigger `onRowClick`.
- Selected rows carry `aria-selected` and `data-selected`; expand toggles carry `aria-expanded` and `aria-controls`.
- The sticky header pins inside the table's own scroll container, so give it a height through `containerClassName`.
- Loading sets `aria-busy` on the table; rows already present stay visible while it refreshes.
- An empty loading table draws `SkeletonState` cells shaped like its columns: square controls, then text lines of
  varied length aligned as each column aligns. A surrounding `SkeletonStateGroup` sets their animation.
- Control labels are localized: `DataTable.selectAll`, `.selectRow`, `.selectColumn`, `.expandRow`, `.collapseRow`,
  `.expandColumn`.
Regression: `tests/unit/presentation/display/DataTableDepth.dom.test.ts`.

## Phones

- Below `stackBreakpoint` each row is a card (the `Table` contract): every value sits beside its column's `header`,
  set as the cell's `label`, so a server render already carries it.
- The checkbox and expand cells head their card inline, without a label.
- Sort buttons and select-all form a bar above the cards, pinned by `hasStickyHeader`; `aria-sort` stays on their
  header cells, `aria-selected` on the rows.
- `phoneLayout: 'scroll'` keeps the plain table, scrolling sideways in its container.
Regression: `tests/unit/presentation/display/TableStacking.dom.test.ts`,
`tests/unit/presentation/display/TableStacked.browser.test.ts`.

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:sortBy` | `'update:sortBy': [sort: DataTableSort \| null];` | Fires when the reader clicks a sortable header, with the next sort or `null` once cleared. |
| `update:selection` | `'update:selection': [keys: SelectionKey[]];` | Fires when the reader selects or deselects rows, with every selected key. |
| `update:expanded` | `'update:expanded': [keys: SelectionKey[]];` | Fires when the reader expands or collapses a row, with every expanded key. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `header` | `header(props: { column: DataTableColumn<T> }): unknown;` | Overrides a column header. Falls back to the column's own `header`. |
| `cell` | `cell(props: { row: T; column: DataTableColumn<T>; index: number }): unknown;` | Overrides a body cell. Falls back to the column's `cell`, then its `accessor`. |
| `emptyContent` | `emptyContent(): unknown;` | Overrides the empty-state content. Falls back to the `emptyContent` prop. |
| `expanded` | `expanded?(props: { row: T; index: number }): unknown;` | The detail row under an expanded row; its presence adds the expand toggle column. |
| `loading` | `loading?(): unknown;` | Replaces the skeleton rows drawn while an empty table loads. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
