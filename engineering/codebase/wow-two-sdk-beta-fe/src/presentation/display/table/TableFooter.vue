<script lang="ts">
/* No props of its own — every attribute falls through. The block itself is load-bearing:
   in a `<script setup>`-only SFC, `vue-eslint-parser` loses `ignoreRestSiblings` and the
   `const { class: _class, ...others }` omission below trips `no-unused-vars`. */
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { TableSection, TableSectionKey, stackAttribute, stackRole, useTableContext } from './TableContext';

/** Renders the `tfoot` section of a `Table`, for summary rows under the body. */
defineOptions({ name: 'TableFooter', inheritAttrs: false });

/** The footer rows — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableSectionElement>('el');
const table = useTableContext();
provide(TableSectionKey, TableSection.Foot);

const classes = computed(() =>
  cn(
    'border-t border-border bg-muted/50 font-medium',
    'table-stacked:mt-2 table-stacked:flex table-stacked:flex-col table-stacked:gap-2',
    'table-stacked:border-t-0 table-stacked:bg-transparent',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <tfoot
    ref="el"
    :role="stackRole(table, 'rowgroup')"
    :data-stack="stackAttribute(table)"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </tfoot>
</template>
