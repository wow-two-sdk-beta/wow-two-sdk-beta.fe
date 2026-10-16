<script lang="ts">
/**
 * The prop surface of `OverlayBody`.
 *
 * React declared `extends HTMLAttributes<HTMLDivElement>` plus `children`;
 * attributes reach the root through `useAttrs` here and `children` is the
 * default slot, which leaves no declared prop.
 */
export type OverlayBodyProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../foundation/styles';

/** Renders the main content region of a Modal / Drawer panel. */
defineOptions({ name: 'OverlayBody', inheritAttrs: false });

/** The body content — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/* In a height-capped panel the body is what scrolls; the inline padding keeps focus rings inside its clip. */
const classes = computed(() =>
  cn('-mx-1 min-h-0 flex-1 overflow-y-auto px-1 text-sm text-foreground', attrs.class as string | undefined),
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
