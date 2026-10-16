<script lang="ts">
import type { ElementType } from '../../../foundation/dom';
import type { GridColumns, GridGap, GridResponsive } from './Grid.variants';

export interface GridProps {
  readonly as?: ElementType;
  /**
   * The equal-column track count. Scalar (`'3'`) emits `grid-cols-3`; a responsive
   * map (`{ base: '1', md: '2', lg: '3' }`) emits per-breakpoint prefixed
   * classes. Default `'2'`.
   */
  readonly columns?: GridColumns | GridResponsive<GridColumns>;

  /**
   * The gap between tracks. Scalar (`'4'`) emits `gap-4`; a responsive map
   * (`{ base: '2', lg: '6' }`) emits per-breakpoint prefixed classes. Default `'4'`.
   */
  readonly gap?: GridGap | GridResponsive<GridGap>;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { resolveGridColumns, resolveGridGap } from './Grid.variants';

/**
 * Renders a CSS grid container with column and gap variants. Both `columns` and `gap`
 * accept a scalar value or a responsive `{ base, sm, md, lg, xl }` map. For
 * non-uniform tracks pass an explicit `:style="{ gridTemplateColumns }"` — the
 * variant covers the equal-column case.
 */
defineOptions({ name: 'Grid', inheritAttrs: false });

const props = withDefaults(defineProps<GridProps>(), {
  as: 'div',
  columns: '2',
  gap: '4',
});

defineSlots<{
  /** The grid items. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() =>
  cn('grid', resolveGridColumns(props.columns), resolveGridGap(props.gap), attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component :is="props.as" ref="el" v-bind="rest" :class="classes"><slot /></component>
</template>
