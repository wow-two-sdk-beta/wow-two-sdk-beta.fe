<script lang="ts">
/** Defines props for the column-balanced masonry arrangement. */
export interface MasonryLayoutProps {
  /** The column count, or the most columns when `minColumnWidth` is set. Default 3; rounded, at least 1. */
  readonly columns?: number;

  /** The narrowest a column may get, as a CSS length — narrower containers drop columns. */
  readonly minColumnWidth?: string;

  /** The gap between columns and between stacked items, as a CSS length. Default `1rem`. */
  readonly gap?: string;
}

/** @internal The column count used when `columns` is not a finite number. */
const DefaultColumns = 3;
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';

/**
 * Renders children as masonry — items of uneven height flow down balanced columns with no row gaps, the way
 * a photo wall or a card board reads. Items keep source order down each column, then across.
 */
defineOptions({ name: 'MasonryLayout', inheritAttrs: false });

/** The items; each child is kept whole within one column. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<MasonryLayoutProps>(), {
  columns: DefaultColumns,
  minColumnWidth: undefined,
  gap: '1rem',
});

const attrs = useAttrs();

const columnCount = computed(() =>
  Math.max(1, Math.round(Number.isFinite(props.columns) ? props.columns : DefaultColumns)),
);

/** The multi-column layout, and the gap every child repeats below itself. */
const layoutStyle = computed(() => ({
  columns: props.minColumnWidth ? `${props.minColumnWidth} ${columnCount.value}` : String(columnCount.value),
  columnGap: props.gap,
  '--masonry-gap': props.gap,
}));

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const classes = computed(() => cn('*:mb-(--masonry-gap) *:break-inside-avoid *:last:mb-0', attrs.class as ClassValue));
</script>

<template>
  <div v-bind="rest" :class="classes" :style="layoutStyle" :data-columns="columnCount">
    <slot />
  </div>
</template>
