<script lang="ts">
import type { SelectionKey, SelectionMode } from '../../../foundation/selection';
import type { TableDensity } from '../table';

/** Defines the sort order of a DataTable column. */
export const SortDirection = {
  /** Refers to ascending order. */
  Asc: 'asc',
  /** Refers to descending order. */
  Desc: 'desc',
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

/** Defines the horizontal text alignment of a DataTable column. */
export const DataTableColumnAlign = {
  /** Refers to left alignment. */
  Left: 'left',
  /** Refers to centered alignment. */
  Center: 'center',
  /** Refers to right alignment. */
  Right: 'right',
} as const;

export type DataTableColumnAlign = (typeof DataTableColumnAlign)[keyof typeof DataTableColumnAlign];

export interface DataTableSort {
  readonly columnKey: string;
  readonly direction: SortDirection;
}

export interface DataTableColumn<T> {
  readonly key: string;
  /**
   * The header label. React took a `ReactNode`; a column is an array entry and
   * cannot become its own slot, so the scalar stays here and the `header`
   * scoped slot is the rich override.
   */
  readonly header: string | number;
  readonly accessor?: (row: T) => unknown;
  /**
   * The per-cell renderer — this column's rich override. Returns text, a number, a VNode (`h(Badge, …)`) or an
   * array of VNodes; any other value renders as its display string. The `cell` scoped slot overrides every
   * column at once.
   */
  readonly cell?: (row: T, index: number) => unknown;
  readonly isSortable?: boolean;
  /** Custom row comparison; takes precedence over accessor-based sorting. */
  readonly compare?: (left: T, right: T) => number;
  readonly align?: DataTableColumnAlign;
  readonly width?: string;
}

export interface DataTableProps<T> {
  readonly columns: ReadonlyArray<DataTableColumn<T>>;
  readonly data: ReadonlyArray<T>;
  readonly rowKey?: (row: T, index: number) => string | number;
  /**
   * Fires with the clicked row and its index.
   *
   * Kept a prop rather than an emit because its *presence* is load-bearing — it
   * seeds `isHoverable` and the `cursor-pointer` class, and Vue strips declared
   * emit listeners out of `useAttrs()`.
   */
  readonly onRowClick?: (row: T, index: number) => void;
  readonly sortBy?: DataTableSort | null;
  readonly defaultSortBy?: DataTableSort | null;
  readonly isStriped?: boolean;
  readonly isHoverable?: boolean;
  readonly density?: TableDensity;
  readonly isBare?: boolean;
  /** The empty-state text. Default `No results.`; override richly via the `emptyContent` slot. */
  readonly emptyContent?: string | number;

  /** How many rows the reader may select. Default `none`; `single` and `multiple` add a checkbox column. */
  readonly selectionMode?: SelectionMode;

  /** The selected row keys, controlled. The `v-model:selection` binding target. */
  readonly selection?: ReadonlyArray<SelectionKey>;

  /** The initially selected row keys when uncontrolled. Default none. */
  readonly defaultSelection?: ReadonlyArray<SelectionKey>;

  /** Whether a row can be selected, given its data index. Default every row. */
  readonly isRowSelectable?: (row: T, index: number) => boolean;

  /** The expanded row keys, controlled. The `v-model:expanded` binding target. */
  readonly expanded?: ReadonlyArray<SelectionKey>;

  /** The initially expanded row keys when uncontrolled. Default none. */
  readonly defaultExpanded?: ReadonlyArray<SelectionKey>;

  /** Whether a row can expand when the `expanded` slot is set, given its data index. Default every row. */
  readonly isRowExpandable?: (row: T, index: number) => boolean;

  /** Whether the header row stays pinned while the body scrolls inside `containerClassName`'s height. */
  readonly hasStickyHeader?: boolean;

  /** Whether data is loading — marks the table busy and draws skeleton rows while it is empty. */
  readonly isLoading?: boolean;

  /** The skeleton rows drawn while an empty table loads. Default 5. */
  readonly loadingRowCount?: number;

  /** Classes for the scroll container — a height such as `max-h-96` lets a sticky header pin. */
  readonly containerClassName?: string;
}

/** @internal The skeleton rows drawn while an empty table loads, when `loadingRowCount` is not set. */
const DefaultLoadingRows = 5;

/** @internal Whether two key lists hold the same members. */
function sameKeys(a: ReadonlyArray<SelectionKey>, b: ReadonlyArray<SelectionKey>): boolean {
  if (a.length !== b.length) return false;
  const lookup = new Set(b);
  return a.every((key) => lookup.has(key));
}
</script>

<script setup lang="ts" generic="T">
import { computed, isVNode, toDisplayString, type FunctionalComponent, type VNodeChild } from 'vue';
import { useLocale } from '../../../foundation/i18n';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-vue-next';
import { useId } from '../../../foundation/identifiers';
import {
  compareValues,
  createSelection,
  deselect,
  extendSelection,
  isNullish,
  isSelected,
  select,
  selectionStatus,
  toggle,
  toggleAll,
  SelectionMode as SelectionModeToken,
  SelectionStatus,
  type SelectionState,
} from '../../../foundation/selection';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import CheckboxInput from '../../forms/checkboxInput/CheckboxInput.vue';
import SkeletonState from '../../feedback/skeletonState/SkeletonState.vue';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../table';

/**
 * Renders a sortable table from a `columns` descriptor, wrapping the `Table` primitives, with optional row
 * selection, expandable detail rows, a pinned header and a loading state.
 *
 * `class` and `aria-label` reach the inner `<table>` by fallthrough, which is why this component keeps `inheritAttrs`
 * on.
 */
defineOptions({ name: 'DataTable' });

const props = withDefaults(defineProps<DataTableProps<T>>(), {
  rowKey: undefined,
  onRowClick: undefined,
  sortBy: undefined,
  defaultSortBy: undefined,
  // Explicit `undefined` so an absent Boolean prop is not cast to `false` and
  // each one keeps deferring to `Table`'s own default.
  isStriped: undefined,
  isHoverable: undefined,
  density: undefined,
  isBare: undefined,
  selectionMode: SelectionModeToken.None,
  selection: undefined,
  defaultSelection: undefined,
  isRowSelectable: undefined,
  expanded: undefined,
  defaultExpanded: undefined,
  isRowExpandable: undefined,
  hasStickyHeader: false,
  isLoading: false,
  loadingRowCount: DefaultLoadingRows,
  containerClassName: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader clicks a sortable header, with the next sort or `null` once cleared. */
  'update:sortBy': [sort: DataTableSort | null];

  /** Fires when the reader selects or deselects rows, with every selected row key. */
  'update:selection': [keys: SelectionKey[]];

  /** Fires when the reader expands or collapses a row, with every expanded row key. */
  'update:expanded': [keys: SelectionKey[]];
}>();

const slots = defineSlots<{
  /** Overrides a column header. Falls back to the column's own `header`. */
  header(props: { column: DataTableColumn<T> }): unknown;
  /** Overrides a body cell. Falls back to the column's `cell`, then its `accessor`. */
  cell(props: { row: T; column: DataTableColumn<T>; index: number }): unknown;
  /** Overrides the empty-state content. Falls back to the `emptyContent` prop. */
  emptyContent(): unknown;
  /** The detail row under an expanded row; its presence adds the expand toggle column. */
  expanded?(props: { row: T; index: number }): unknown;
  /** Replaces the skeleton rows drawn while an empty table loads. */
  loading?(): unknown;
}>();

const locale = useLocale();
const tableId = useId();

const emptyText = computed(() => props.emptyContent ?? locale.t('DataTable.emptyContent', undefined, 'No results.'));

const { value: sort, setValue: setSort } = useControlled<DataTableSort | null>({
  controlled: () => props.sortBy,
  default: props.defaultSortBy ?? null,
  onChange: (next) => emit('update:sortBy', next),
});

const { value: selectedKeys, setValue: setSelectedKeys } = useControlled<ReadonlyArray<SelectionKey>>({
  controlled: () => props.selection,
  default: props.defaultSelection ?? [],
  onChange: (next) => emit('update:selection', [...next]),
});

const { value: expandedKeys, setValue: setExpandedKeys } = useControlled<ReadonlyArray<SelectionKey>>({
  controlled: () => props.expanded,
  default: props.defaultExpanded ?? [],
  onChange: (next) => emit('update:expanded', [...next]),
});

/** @internal The fixed end of a shift-click range — interaction state, never part of the model. */
let selectionAnchor: SelectionKey | null = null;

/** @internal Whether the pointer press that toggles a row checkbox held Shift. */
let isRangeGesture = false;

/** React seeded `isHoverable` from `!!onRowClick`; kept as an explicit fallback. */
const resolvedHoverable = computed(() => props.isHoverable ?? props.onRowClick != null);

const hasSelection = computed(() => props.selectionMode !== SelectionModeToken.None);
const hasExpansion = computed(() => slots.expanded !== undefined);

/** Every body column, including the selection and expansion control columns. */
const columnCount = computed(() => props.columns.length + (hasSelection.value ? 1 : 0) + (hasExpansion.value ? 1 : 0));

const selectedLookup = computed(() => new Set(selectedKeys.value));
const expandedLookup = computed(() => new Set(expandedKeys.value));

/** The rows with their stable keys, which come from the data order so sorting never changes them. */
const keyedRows = computed(() =>
  props.data.map((row, dataIndex) => ({
    row,
    dataIndex,
    key: props.rowKey ? props.rowKey(row, dataIndex) : dataIndex,
  })),
);

const sortedRows = computed(() => {
  const active = sort.value;
  if (!active) return keyedRows.value;
  const column = props.columns.find((entry) => entry.key === active.columnKey);
  const accessor = column?.accessor;
  if (!accessor && !column?.compare) return keyedRows.value;
  return keyedRows.value
    .map((entry) => ({ entry, value: column?.compare ? undefined : accessor?.(entry.row) }))
    .sort((a, b) => {
      if (column?.compare) {
        const result = column.compare(a.entry.row, b.entry.row);
        return active.direction === SortDirection.Asc ? result : -result;
      }
      /* The shared foundation ordering: absent values land last in both directions, outside the flip. */
      const isLeftAbsent = isNullish(a.value);
      const isRightAbsent = isNullish(b.value);
      if (isLeftAbsent || isRightAbsent) return isLeftAbsent === isRightAbsent ? 0 : isLeftAbsent ? 1 : -1;
      const result = compareValues(a.value, b.value, { locale: locale.locale.value });
      return active.direction === SortDirection.Asc ? result : -result;
    })
    .map(({ entry }) => entry);
});

const rows = computed(() =>
  sortedRows.value.map(({ row, key, dataIndex }, index) => {
    const isRowSelected = selectedLookup.value.has(key);
    return {
      key,
      row,
      index,
      isSelected: isRowSelected,
      isSelectable: hasSelection.value && (props.isRowSelectable?.(row, dataIndex) ?? true),
      isExpandable: hasExpansion.value && (props.isRowExpandable?.(row, dataIndex) ?? true),
      isExpanded: expandedLookup.value.has(key),
      detailId: `${tableId}-detail-${dataIndex}`,
      /* `onClick` only exists when a handler was supplied — React's `onClick={onRowClick ? … : undefined}`. */
      attrs: {
        ...(hasSelection.value
          ? { 'aria-selected': isRowSelected, 'data-selected': isRowSelected ? '' : undefined }
          : {}),
        ...(props.onRowClick
          ? {
              tabindex: 0,
              onClick: (event: MouseEvent): void => {
                if (event.defaultPrevented || (event.target as Element | null)?.closest('[data-row-control]')) return;
                props.onRowClick?.(row, index);
              },
              onKeydown: (event: KeyboardEvent): void => {
                if (
                  event.target !== event.currentTarget ||
                  event.defaultPrevented ||
                  !['Enter', ' '].includes(event.key)
                )
                  return;
                event.preventDefault();
                props.onRowClick?.(row, index);
              },
            }
          : {}),
      },
      class: cn(
        props.onRowClick &&
          'cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2',
        isRowSelected && 'bg-primary-soft/40 hover:bg-primary-soft/60',
      ),
    };
  }),
);

/** The keys of every selectable row, in display order — the scope of select-all and shift ranges. */
const selectableKeys = computed(() => rows.value.filter((entry) => entry.isSelectable).map((entry) => entry.key));

/** The header checkbox's tri-state over the selectable rows. */
const headerStatus = computed(() =>
  selectionStatus(createSelection(SelectionModeToken.Multiple, selectedKeys.value), selectableKeys.value),
);

const skeletonRows = computed(() =>
  Array.from({ length: Math.max(1, Math.round(props.loadingRowCount) || DefaultLoadingRows) }, (_, index) => index),
);

const isShowingSkeleton = computed(() => props.isLoading && rows.value.length === 0);

function cycleSort(columnKey: string): void {
  const active = sort.value;
  if (!active || active.columnKey !== columnKey) {
    setSort({ columnKey, direction: SortDirection.Asc });
  } else if (active.direction === SortDirection.Asc) {
    setSort({ columnKey, direction: SortDirection.Desc });
  } else {
    setSort(null);
  }
}

function alignClass(align: DataTableColumn<T>['align']): string {
  if (align === DataTableColumnAlign.Right) return 'text-right';
  if (align === DataTableColumnAlign.Center) return 'text-center';
  return 'text-left';
}

/** Line lengths a loading cell cycles through, so the placeholder reads as varied text rather than a grid of bars. */
const SkeletonLineWidths = ['w-3/4', 'w-1/2', 'w-5/6', 'w-2/3'] as const;

/** A loading cell's text line, sitting where the column aligns its content. */
function skeletonLineClass(align: DataTableColumn<T>['align'], row: number, column: number): string {
  return cn(
    'max-w-48',
    SkeletonLineWidths[(row + column) % SkeletonLineWidths.length],
    align === DataTableColumnAlign.Right && 'ml-auto',
    align === DataTableColumnAlign.Center && 'mx-auto',
  );
}

const headerCells = computed(() =>
  props.columns.map((column) => {
    const active = sort.value;
    const isSorted = active?.columnKey === column.key;
    return {
      key: column.key,
      column,
      isSorted,
      isAscending: isSorted && active?.direction === SortDirection.Asc,
      ariaSort: isSorted
        ? active?.direction === SortDirection.Asc
          ? 'ascending'
          : 'descending'
        : column.isSortable
          ? 'none'
          : undefined,
      style: column.width ? { width: column.width } : undefined,
      class: alignClass(column.align),
    };
  }),
);

/** The column's own renderer, then its accessor — the fallback under the `cell` slot. */
function renderCell(column: DataTableColumn<T>, row: T, index: number): unknown {
  if (column.cell) return column.cell(row, index);
  if (column.accessor) return column.accessor(row);
  return null;
}

/*
 * Renders a cell value: VNodes (and arrays of them) mount as markup, everything else as its display string.
 * Interpolating a VNode instead would JSON-stringify it — which throws on the VNode's circular component link.
 */
const CellContent: FunctionalComponent<{ value: unknown }> = ({ value }): VNodeChild => {
  if (isVNode(value)) return value;
  if (Array.isArray(value) && value.length > 0 && value.every((item) => isVNode(item))) return value as VNodeChild;
  return toDisplayString(value);
};
CellContent.props = ['value'];

/** The current selection as a model state, carrying the range anchor. */
function selectionState(): SelectionState<SelectionKey> {
  return createSelection(props.selectionMode, selectedKeys.value, selectionAnchor);
}

/** Requests the next selection, keeping its anchor and emitting only a real change. */
function commitSelection(next: SelectionState<SelectionKey>): void {
  selectionAnchor = next.anchor;
  const keys = [...next.keys];
  if (!sameKeys(keys, selectedKeys.value)) setSelectedKeys(keys);
}

/** Records whether the press about to toggle a row checkbox held Shift. */
function rememberGesture(event: MouseEvent): void {
  isRangeGesture = event.shiftKey;
}

/** Toggles one row — a Shift press in multiple mode selects the range from the anchor. */
function toggleRow(key: SelectionKey): void {
  const state = selectionState();
  const isRange = isRangeGesture && props.selectionMode === SelectionModeToken.Multiple;
  isRangeGesture = false;
  if (isRange) commitSelection(extendSelection(state, key, selectableKeys.value));
  else if (props.selectionMode === SelectionModeToken.Single)
    commitSelection(isSelected(state, key) ? deselect(state, key) : select(state, key));
  else commitSelection(toggle(state, key));
}

/** Selects every selectable row, or clears them when all are selected. */
function toggleAllRows(): void {
  commitSelection(toggleAll(selectionState(), selectableKeys.value));
}

/** Expands a collapsed row or collapses an expanded one. */
function toggleExpanded(key: SelectionKey): void {
  const next = new Set(expandedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  setExpandedKeys([...next]);
}

/** The expand chevron's classes — it points down once its row is expanded, and mirrors right to left. */
function expandIconClass(isExpanded: boolean): string {
  return cn('size-4 transition-transform rtl:-scale-x-100', isExpanded && 'rotate-90 rtl:scale-x-100');
}

const SortButtonClass =
  'inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring';

const ExpandButtonClass =
  'inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring';
</script>

<template>
  <Table
    :is-striped="isStriped"
    :is-hoverable="resolvedHoverable"
    :density="density"
    :is-bare="isBare"
    :container-class-name="containerClassName"
    :has-sticky-header="hasStickyHeader"
    :aria-busy="isLoading || undefined"
  >
    <TableHead>
      <TableRow>
        <TableHeaderCell v-if="hasExpansion" class="w-10">
          <span class="sr-only">{{ locale.t('DataTable.expandColumn', undefined, 'Details') }}</span>
        </TableHeaderCell>
        <TableHeaderCell v-if="hasSelection" class="w-10" data-row-control>
          <CheckboxInput
            v-if="selectionMode === SelectionModeToken.Multiple"
            size="sm"
            :model-value="headerStatus === SelectionStatus.All"
            :is-indeterminate="headerStatus === SelectionStatus.Some"
            :is-disabled="selectableKeys.length === 0"
            :aria-label="locale.t('DataTable.selectAll', undefined, 'Select all rows')"
            @update:model-value="toggleAllRows"
          />
          <span v-else class="sr-only">{{ locale.t('DataTable.selectColumn', undefined, 'Select') }}</span>
        </TableHeaderCell>
        <TableHeaderCell
          v-for="cell in headerCells"
          :key="cell.key"
          :aria-sort="cell.ariaSort"
          :style="cell.style"
          :class="cell.class"
        >
          <button v-if="cell.column.isSortable" type="button" :class="SortButtonClass" @click="cycleSort(cell.key)">
            <span>
              <slot name="header" :column="cell.column">{{ cell.column.header }}</slot>
            </span>
            <ArrowUp v-if="cell.isSorted && cell.isAscending" class="h-3.5 w-3.5" />
            <ArrowDown v-else-if="cell.isSorted" class="h-3.5 w-3.5" />
            <ArrowUpDown v-else class="h-3.5 w-3.5 opacity-50" />
          </button>
          <slot v-else name="header" :column="cell.column">{{ cell.column.header }}</slot>
        </TableHeaderCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <template v-if="isShowingSkeleton">
        <slot name="loading">
          <TableRow v-for="index in skeletonRows" :key="`skeleton-${index}`" data-skeleton-row>
            <TableCell v-if="hasExpansion" class="w-10" data-row-control>
              <SkeletonState class="size-4 rounded-sm" />
            </TableCell>
            <TableCell v-if="hasSelection" class="w-10" data-row-control>
              <SkeletonState class="size-4 rounded-sm" />
            </TableCell>
            <TableCell v-for="(column, position) in columns" :key="column.key" :class="alignClass(column.align)">
              <SkeletonState shape="text" :class="skeletonLineClass(column.align, index, position)" />
            </TableCell>
          </TableRow>
        </slot>
      </template>
      <template v-else-if="rows.length === 0">
        <TableRow>
          <TableCell :colspan="columnCount" class="py-8 text-center text-muted-foreground">
            <slot name="emptyContent">{{ emptyText }}</slot>
          </TableCell>
        </TableRow>
      </template>
      <template v-else>
        <template v-for="row in rows" :key="row.key">
          <TableRow v-bind="row.attrs" :class="row.class">
            <TableCell v-if="hasExpansion" class="w-10" data-row-control>
              <button
                v-if="row.isExpandable"
                type="button"
                :class="ExpandButtonClass"
                :aria-expanded="row.isExpanded"
                :aria-controls="row.isExpanded ? row.detailId : undefined"
                :aria-label="
                  row.isExpanded
                    ? locale.t('DataTable.collapseRow', undefined, 'Hide details')
                    : locale.t('DataTable.expandRow', undefined, 'Show details')
                "
                @click="toggleExpanded(row.key)"
              >
                <ChevronRight :class="expandIconClass(row.isExpanded)" />
              </button>
            </TableCell>
            <TableCell v-if="hasSelection" class="w-10" data-row-control @click.capture="rememberGesture">
              <CheckboxInput
                size="sm"
                :model-value="row.isSelected"
                :is-disabled="!row.isSelectable"
                :aria-label="locale.t('DataTable.selectRow', undefined, 'Select row')"
                @update:model-value="toggleRow(row.key)"
              />
            </TableCell>
            <TableCell v-for="column in columns" :key="column.key" :class="alignClass(column.align)">
              <slot name="cell" :row="row.row" :column="column" :index="row.index"
                ><CellContent :value="renderCell(column, row.row, row.index)"
              /></slot>
            </TableCell>
          </TableRow>
          <TableRow v-if="row.isExpandable && row.isExpanded" :id="row.detailId" data-detail-row>
            <TableCell :colspan="columnCount" class="bg-muted/30">
              <slot name="expanded" :row="row.row" :index="row.index" />
            </TableCell>
          </TableRow>
        </template>
      </template>
    </TableBody>
  </Table>
</template>
