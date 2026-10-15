<script lang="ts">
/** Defines the Table header typography treatment. */
export const TableHeadVariant = {
  /** Refers to the uppercase, tracked default. */
  Uppercase: 'uppercase',
  /** Refers to normal-case `text-sm` heads. */
  Plain: 'plain',
} as const;

export type TableHeadVariant = (typeof TableHeadVariant)[keyof typeof TableHeadVariant];

const HeadVariant: Record<TableHeadVariant, string> = {
  uppercase: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  plain: 'text-sm font-semibold text-foreground',
};

export interface TableHeadProps {
  /** The typography treatment for the header row. Defaults to `uppercase` (current look). */
  readonly headVariant?: TableHeadVariant;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import {
  StackedPassiveHeaderClass,
  TableSection,
  TableSectionKey,
  stackAttribute,
  stackRole,
  useTableContext,
} from './TableContext';

/** Renders the `thead` section of a `Table`, holding its header row. */
defineOptions({ name: 'TableHead', inheritAttrs: false });

/** The header rows — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TableHeadProps>(), {
  headVariant: TableHeadVariant.Uppercase,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableSectionElement>('el');

const table = useTableContext();
provide(TableSectionKey, TableSection.Head);

/* A pinned head paints opaque so rows never show through, and draws its rule as an inset shadow: a collapsed
   table's borders belong to the table and scroll away with the body. Stacked, the head becomes a bar of its
   controls — sort buttons, select-all — above the cards, and leaves only assistive text when it holds none. */
const classes = computed(() =>
  cn(
    'border-b border-border bg-muted/50',
    table.hasStickyHeader && 'sticky top-0 z-raised bg-muted shadow-[inset_0_-1px_0_var(--color-border)]',
    'table-stacked:mb-2 table-stacked:block table-stacked:rounded-lg table-stacked:border',
    StackedPassiveHeaderClass,
    HeadVariant[props.headVariant],
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
  <thead
    ref="el"
    :role="stackRole(table, 'rowgroup')"
    :data-stack="stackAttribute(table)"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </thead>
</template>
