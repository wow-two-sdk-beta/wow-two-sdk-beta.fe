<script lang="ts">
export interface TableHeaderCellProps {
  /**
   * The label shown beside a row header's value when the table stacks. Omit it and the column's header text is
   * used; an empty string shows none. Ignored in the head row.
   */
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import {
  DensityCell,
  StackedCellClass,
  StackedPassiveHeaderClass,
  TableSection,
  stackAttribute,
  stackRole,
  useTableContext,
  useTableSection,
} from './TableContext';

/** Renders a `th` column header in a `Table`, padded to the root density. */
defineOptions({ name: 'TableHeaderCell', inheritAttrs: false });

/** The header cell content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TableHeaderCellProps>(), { label: undefined });

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableCellElement>('el');
const table = useTableContext();
const isInHead = useTableSection() === TableSection.Head;

/* Stacked, a column header is an item in the head's control bar — at its own width, hidden when it holds no
   control — and a row header lays out like any body cell. */
const StackedColumnHeaderClass = cn(
  'table-stacked:block table-stacked:w-auto! table-stacked:px-2 table-stacked:py-1',
  StackedPassiveHeaderClass,
);

const classes = computed(() =>
  cn(
    DensityCell[table.density],
    'font-semibold text-foreground',
    isInHead ? StackedColumnHeaderClass : StackedCellClass,
    attrs.class as string | undefined,
  ),
);

/* The restated role follows the scope a caller may set: `row` makes a row header. */
const role = computed(() =>
  stackRole(table, (attrs.scope as string | undefined) === 'row' ? 'rowheader' : 'columnheader'),
);

const label = computed(() => (isInHead ? undefined : props.label || undefined));
const isLabelFixed = computed(() => !isInHead && props.label !== undefined);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <th
    ref="el"
    scope="col"
    :role="role"
    :data-stack="stackAttribute(table)"
    :data-label="label"
    :data-fixed-label="isLabelFixed ? '' : undefined"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </th>
</template>
