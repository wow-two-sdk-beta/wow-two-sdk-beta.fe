<script lang="ts">
/**
 * The prop surface of `OverlayFooter`.
 *
 * React declared `extends HTMLAttributes<HTMLDivElement>` plus `children`;
 * attributes reach the root through `useAttrs` here and `children` is the
 * default slot, which leaves no declared prop.
 */
export type OverlayFooterProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../foundation/styles';

/** Renders the trailing action row of a Modal / Drawer panel — stacked on narrow, right-aligned from `sm`. */
defineOptions({ name: 'OverlayFooter', inheritAttrs: false });

/** The footer content — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn('mt-6 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end', attrs.class as string | undefined),
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
