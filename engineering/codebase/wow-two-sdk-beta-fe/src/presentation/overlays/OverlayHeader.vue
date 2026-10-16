<script lang="ts">
/**
 * The prop surface of `OverlayHeader`.
 *
 * React declared `extends HTMLAttributes<HTMLDivElement>` plus `children`;
 * attributes reach the root through `useAttrs` here and `children` is the
 * default slot, which leaves no declared prop.
 */
export type OverlayHeaderProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../foundation/styles';

/** Renders the stacked title and description region at the top of a Modal / Drawer panel. */
defineOptions({ name: 'OverlayHeader', inheritAttrs: false });

/** The header content — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() => cn('mb-4 flex shrink-0 flex-col gap-1.5', attrs.class as string | undefined));

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
