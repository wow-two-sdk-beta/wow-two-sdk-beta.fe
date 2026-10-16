<script lang="ts">
import {
  DataGridEditorCellType,
  DataGridEditorColumnAlign,
  DataGridEditorMove,
  type DataGridEditorColumn,
} from './DataGridEditorTypes';

export interface DataGridEditorProps<T> {
  readonly columns: ReadonlyArray<DataGridEditorColumn<T>>;
  readonly rows: ReadonlyArray<T>;
  /**
   * Returns the stable key of a row.
   *
   * Kept a prop rather than an emit: it is called as a plain function on every
   * render, which is not what an emit models.
   */
  readonly rowKey: (row: T) => string;
  /** The dense row height. Default `false`. */
  readonly isDense?: boolean;
  /** Prevent all interactions; inherits the surrounding Field. */
  readonly isDisabled?: boolean;
  /** Keep navigation available while preventing edits; inherits the surrounding Field. */
  readonly isReadOnly?: boolean;
}

interface CellPos {
  row: number;
  col: number;
}

function castValue(raw: string, type: DataGridEditorCellType): unknown {
  if (type === DataGridEditorCellType.Number) {
    if (raw.trim() === '') return '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : raw;
  }
  if (type === DataGridEditorCellType.Boolean) return raw === 'true';
  return raw;
}
</script>

<script setup lang="ts" generic="T">
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { useFormControl } from '../../../foundation/primitives';
import { cn } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import CellEditor from './CellEditor.vue';

/**
 * Renders an editable data grid with keyboard navigation between cells and per-cell edit.
 *
 * Click / Enter / F2 enter edit, Escape reverts. Range select, fill, and paste TSV are deferred — log them in a
 * follow-up batch.
 */
defineOptions({ name: 'DataGridEditor', inheritAttrs: false });

const props = withDefaults(defineProps<DataGridEditorProps<T>>(), {
  /* These three stay declared-required — Vue still warns when one is missing — but
     the defaults keep an absent (or transiently-undefined) value from reaching the
     `.length` reads below, which took the whole page down. An empty grid renders
     its own header-only shell instead. */
  columns: () => [],
  rows: () => [],
  rowKey: (row: unknown) => String(row),
  // Explicit `undefined` so an absent Boolean prop is not cast to `false`.
  isDense: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when a cell edit commits, with the row, the column key, and the cast value. */
  'row-change': [row: T, colKey: string, value: unknown];
}>();

defineSlots<{
  /** Overrides a column header. Falls back to the column's own `header`. */
  header?(props: { column: DataGridEditorColumn<T> }): unknown;
  /**
   * Overrides a body cell in read mode. Falls back to the column's `cell`
   * renderer, then to its `accessor`.
   */
  cell?(props: { row: T; column: DataGridEditorColumn<T>; rowIndex: number; colIndex: number }): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const tableEl = useTemplateRef<HTMLTableElement>('tableEl');

const active = ref<CellPos>({ row: 0, col: 0 });
const editing = ref(false);
const draft = ref('');
const field = useFormControl();
const disabled = computed(() => props.isDisabled ?? field?.isDisabled);
const readOnly = computed(() => props.isReadOnly ?? field?.isReadOnly);
let editOwner: { rowKey: string; columnKey: string; value: unknown } | null = null;
let restoreGridFocus = false;

const gridId = useId();
function cellId(row: number, col: number): string {
  return `${gridId}-cell-${row}-${col}`;
}

const colCount = computed(() => props.columns.length);
const rowCount = computed(() => props.rows.length);

// The editor just unmounted — without this, focus drops to <body> and the
// grid's keyboard navigation goes dead. The editor focuses itself, so only the
// return trip is handled here.
watch(
  editing,
  (isEditing, wasEditing) => {
    if (!isEditing && wasEditing && restoreGridFocus) tableEl.value?.focus();
    if (!isEditing) restoreGridFocus = false;
  },
  { flush: 'post' },
);

function beginEdit(): void {
  if (disabled.value || readOnly.value) return;
  const column = props.columns[active.value.col];
  const row = props.rows[active.value.row];
  if (!column || row === undefined) return;
  if (column.isEditable === false) return;
  const raw = column.accessor(row);
  editOwner = { rowKey: props.rowKey(row), columnKey: column.key, value: raw };
  draft.value = raw == null ? '' : String(raw);
  editing.value = true;
}

function commitEdit(move?: DataGridEditorMove, rawValue?: string): void {
  if (!editing.value || disabled.value || readOnly.value || !editOwner) return;
  if (!reconcileEdit()) return;
  restoreGridFocus = move !== undefined;
  const column = props.columns[active.value.col];
  const row = props.rows[active.value.row];
  if (!column || row === undefined) {
    editing.value = false;
    return;
  }
  // rawValue lets editors commit synchronously with the fresh value — the draft
  // is still the previous text when a select's change and its commit fire in the
  // same event (select/boolean editors).
  const value = castValue(rawValue ?? draft.value, column.type ?? DataGridEditorCellType.Text);
  editing.value = false;
  editOwner = null;
  emit('row-change', row, column.key, value);
  if (move === DataGridEditorMove.Right) {
    active.value = {
      row: active.value.row,
      col: Math.min(colCount.value - 1, active.value.col + 1),
    };
  }
  if (move === DataGridEditorMove.Down) {
    active.value = {
      row: Math.min(rowCount.value - 1, active.value.row + 1),
      col: active.value.col,
    };
  }
}

function cancelEdit(): void {
  restoreGridFocus = true;
  editing.value = false;
  editOwner = null;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing || event.defaultPrevented || disabled.value || rowCount.value === 0 || colCount.value === 0)
    return;
  if (editing.value) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEdit(DataGridEditorMove.Down);
    } else if (event.key === 'Tab') {
      if (event.shiftKey || active.value.col === colCount.value - 1) {
        commitEdit();
        return;
      }
      event.preventDefault();
      commitEdit(DataGridEditorMove.Right);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
    return;
  }
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      active.value = {
        row: active.value.row,
        col: Math.min(colCount.value - 1, active.value.col + 1),
      };
      break;
    case 'ArrowLeft':
      event.preventDefault();
      active.value = { row: active.value.row, col: Math.max(0, active.value.col - 1) };
      break;
    case 'ArrowDown':
      event.preventDefault();
      active.value = {
        row: Math.min(rowCount.value - 1, active.value.row + 1),
        col: active.value.col,
      };
      break;
    case 'ArrowUp':
      event.preventDefault();
      active.value = { row: Math.max(0, active.value.row - 1), col: active.value.col };
      break;
    case 'Home':
      event.preventDefault();
      active.value = { row: active.value.row, col: 0 };
      break;
    case 'End':
      event.preventDefault();
      active.value = { row: active.value.row, col: colCount.value - 1 };
      break;
    case 'Enter':
    case 'F2':
      event.preventDefault();
      beginEdit();
      break;
  }
}

function onCellClick(rowIndex: number, colIndex: number): void {
  if (disabled.value) return;
  const column = props.columns[colIndex];
  if (!column) return;
  const isEditingThisCell = editing.value && active.value.row === rowIndex && active.value.col === colIndex;
  active.value = { row: rowIndex, col: colIndex };
  // `active` is already updated on the line above, so the edit starts here with
  // no frame hop.
  if (column.isEditable !== false && !isEditingThisCell) beginEdit();
}

/** Keep a draft attached to the same logical cell across sorting and live updates. */
function reconcileEdit(): boolean {
  if (!editOwner) return false;
  const row = props.rows.findIndex((row) => props.rowKey(row) === editOwner?.rowKey);
  const col = props.columns.findIndex((column) => column.key === editOwner?.columnKey);
  const column = props.columns[col];
  const value = props.rows[row];
  if (
    row < 0 ||
    !column ||
    value === undefined ||
    column.isEditable === false ||
    !Object.is(column.accessor(value), editOwner.value) ||
    disabled.value ||
    readOnly.value
  ) {
    editing.value = false;
    editOwner = null;
    return false;
  }
  active.value = { row, col };
  return true;
}
watch(
  () => [props.rows, props.columns, disabled.value, readOnly.value],
  () => {
    if (editing.value && reconcileEdit()) return;
    active.value = {
      row: Math.max(0, Math.min(rowCount.value - 1, active.value.row)),
      col: Math.max(0, Math.min(colCount.value - 1, active.value.col)),
    };
  },
  { deep: true, flush: 'sync' },
);

function isActiveCell(rowIndex: number, colIndex: number): boolean {
  return active.value.row === rowIndex && active.value.col === colIndex;
}

const cellPad = computed(() => (props.isDense ? 'px-2 py-1' : 'px-3 py-2'));

const headerClasses = computed(() => cn('border-b border-border font-medium text-muted-foreground', cellPad.value));

/** `width` is consumer-supplied CSS, so no unit is implied — Vue would not add one. */
function headerStyle(column: DataGridEditorColumn<T>): Record<string, string | undefined> {
  return { width: column.width, textAlign: column.align ?? DataGridEditorColumnAlign.Left };
}

function cellStyle(column: DataGridEditorColumn<T>): Record<string, string> {
  return { textAlign: column.align ?? DataGridEditorColumnAlign.Left };
}

function cellClasses(column: DataGridEditorColumn<T>, rowIndex: number, colIndex: number): string {
  return cn(
    'relative cursor-cell whitespace-nowrap',
    cellPad.value,
    isActiveCell(rowIndex, colIndex) && 'bg-primary-soft/40 ring-2 ring-inset ring-primary',
    column.isEditable === false && 'cursor-default',
  );
}

/** The read-mode default under the `cell` slot, for columns without their own renderer. */
function displayValue(column: DataGridEditorColumn<T>, row: T): string {
  const value = column.accessor(row);
  if (column.type === DataGridEditorCellType.Boolean) return value ? '✓' : '·';
  return String(value ?? '');
}

const classes = computed(() =>
  cn('overflow-auto rounded-md border border-border bg-card text-sm', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- Scroll container only — the grid role lives on the <table> below.
       A `grid` may own nothing but rows/rowgroups, so putting `role="grid"`
       on a wrapper whose child is a (role `table`) <table> is an illegal
       accessibility tree (axe: aria-required-children). -->
  <div ref="el" v-bind="rest" :class="classes">
    <table
      ref="tableEl"
      role="grid"
      :aria-rowcount="rowCount + 1"
      :aria-colcount="colCount"
      :tabindex="disabled ? -1 : 0"
      :aria-disabled="disabled || undefined"
      :aria-readonly="readOnly || undefined"
      :aria-activedescendant="rowCount > 0 && colCount > 0 ? cellId(active.row, active.col) : undefined"
      class="w-full border-collapse focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      @keydown="onKeydown"
    >
      <thead role="rowgroup">
        <tr role="row" :aria-rowindex="1" class="bg-muted/40">
          <th
            v-for="(column, colIndex) in columns"
            :key="column.key"
            role="columnheader"
            :aria-colindex="colIndex + 1"
            scope="col"
            :style="headerStyle(column)"
            :class="headerClasses"
          >
            <slot name="header" :column="column">{{ column.header }}</slot>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        <tr
          v-for="(row, rowIndex) in rows"
          :key="rowKey(row)"
          role="row"
          :aria-rowindex="rowIndex + 2"
          class="border-b border-border last:border-b-0"
        >
          <td
            v-for="(column, colIndex) in columns"
            :id="cellId(rowIndex, colIndex)"
            :key="column.key"
            role="gridcell"
            :aria-colindex="colIndex + 1"
            :aria-readonly="readOnly || column.isEditable === false || undefined"
            :aria-selected="isActiveCell(rowIndex, colIndex) || undefined"
            :tabindex="-1"
            :style="cellStyle(column)"
            :class="cellClasses(column, rowIndex, colIndex)"
            @click="onCellClick(rowIndex, colIndex)"
          >
            <CellEditor
              v-if="editing && isActiveCell(rowIndex, colIndex)"
              v-model="draft"
              :type="column.type"
              :options="column.options"
              @commit="commitEdit"
              @cancel="cancelEdit"
            />
            <slot v-else name="cell" :row="row" :column="column" :row-index="rowIndex" :col-index="colIndex">
              <template v-if="column.cell">{{ column.cell(row) }}</template>
              <span v-else class="tabular-nums">{{ displayValue(column, row) }}</span>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
