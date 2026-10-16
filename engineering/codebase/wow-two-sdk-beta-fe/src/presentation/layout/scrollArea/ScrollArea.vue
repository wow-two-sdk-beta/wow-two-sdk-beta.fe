<script lang="ts">
/**
 * Defines the scroll axis of a `ScrollArea`. Diverges from the shared
 * `Orientation` (adds `Both`), so it stays a local enum.
 */
export const ScrollAxis = {
  /** Refers to vertical scrolling only. */
  Vertical: 'vertical',
  /** Refers to horizontal scrolling only. */
  Horizontal: 'horizontal',
  /** Refers to scrolling on both axes. */
  Both: 'both',
} as const;

export type ScrollAxis = (typeof ScrollAxis)[keyof typeof ScrollAxis];

export interface ScrollAreaProps {
  /** The scroll axis. Default `vertical`. */
  readonly axis?: ScrollAxis;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a native scrollable container with stable visuals. For custom-styled
 * scrollbars (track + thumb separately animated) use the L5 ScrollArea
 * organism. This atom exists for the common case.
 */
defineOptions({ name: 'ScrollArea', inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaProps>(), { axis: ScrollAxis.Vertical });

defineSlots<{
  /** The scrollable content. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn(
    'relative',
    props.axis === ScrollAxis.Vertical && 'overflow-y-auto overflow-x-hidden',
    props.axis === ScrollAxis.Horizontal && 'overflow-x-auto overflow-y-hidden',
    props.axis === ScrollAxis.Both && 'overflow-auto',
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
  <div ref="el" v-bind="rest" :class="classes"><slot /></div>
</template>
