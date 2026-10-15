<script lang="ts">
/* No props of its own — every attribute falls through. The block itself is load-bearing:
   in a `<script setup>`-only SFC, `vue-eslint-parser` loses `ignoreRestSiblings` and the
   `const { class: _class, ...others }` omission below trips `no-unused-vars`. */
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { TableSection, stackAttribute, stackRole, useTableContext, useTableSection } from './TableContext';

/** Renders a `tr` in a `Table`; `data-selected` tints it with the selection fill. */
defineOptions({ name: 'TableRow', inheritAttrs: false });

/** The row cells — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableRowElement>('el');
const table = useTableContext();
const section = useTableSection();

/* Stacked, a body or footer row is a card; the header row is the bar its controls sit in. */
const classes = computed(() =>
  cn(
    'border-b border-border last:border-0 transition-colors data-[selected]:bg-primary-soft',
    section === TableSection.Head
      ? 'table-stacked:flex table-stacked:flex-wrap table-stacked:items-center table-stacked:gap-1 table-stacked:p-1'
      : 'table-stacked:block table-stacked:rounded-lg table-stacked:border table-stacked:py-1 table-stacked:last:border',
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
  <tr ref="el" :role="stackRole(table, 'row')" :data-stack="stackAttribute(table)" v-bind="rest" :class="classes">
    <slot />
  </tr>
</template>
