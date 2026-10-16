<script lang="ts">
/* No props of its own — every attribute falls through. The block itself is load-bearing:
   in a `<script setup>`-only SFC, `vue-eslint-parser` loses `ignoreRestSiblings` and the
   `const { class: _class, ...others }` omission below trips `no-unused-vars`. */
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { TableSection, TableSectionKey, stackAttribute, stackRole, useTableContext } from './TableContext';

/** Renders the `tbody` of a `Table`, picking up striping and hover from the root. */
defineOptions({ name: 'TableBody', inheritAttrs: false });

/** The body rows — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableSectionElement>('el');
const table = useTableContext();
provide(TableSectionKey, TableSection.Body);

const classes = computed(() =>
  cn(
    'table-stacked:flex table-stacked:flex-col table-stacked:gap-2',
    table.isStriped && '[&>tr:nth-child(even)]:bg-muted/30',
    table.isHoverable && '[&>tr:hover]:bg-muted',
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
  <tbody
    ref="el"
    :role="stackRole(table, 'rowgroup')"
    :data-stack="stackAttribute(table)"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </tbody>
</template>
