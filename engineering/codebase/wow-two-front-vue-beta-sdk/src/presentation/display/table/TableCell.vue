<script lang="ts">
export interface TableCellProps {
  /**
   * The label shown beside the value when the table stacks. Omit it and the column's header text is used; an empty
   * string shows none. Set it where the header holds no text, or to render the label on the server.
   */
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { DensityCell, StackedCellClass, stackAttribute, stackRole, useTableContext } from './TableContext';

/** Renders a `td` in a `Table`, padded to the root density. */
defineOptions({ name: 'TableCell', inheritAttrs: false });

/** The cell content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TableCellProps>(), { label: undefined });

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableCellElement>('el');
const table = useTableContext();

const classes = computed(() =>
  cn(DensityCell[table.density], 'align-middle', StackedCellClass, attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- `data-fixed-label` keeps the table from replacing a caller's label with the header text. -->
  <td
    ref="el"
    :role="stackRole(table, 'cell')"
    :data-stack="stackAttribute(table)"
    :data-label="props.label || undefined"
    :data-fixed-label="props.label === undefined ? undefined : ''"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </td>
</template>
