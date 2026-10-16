<script lang="ts">
/**
 * The prop surface of `OverlayTitle`.
 *
 * React declared `extends HTMLAttributes<HTMLHeadingElement>` plus `children`;
 * attributes reach the root through `useAttrs` here and `children` is the
 * default slot, which leaves no declared prop.
 */
export type OverlayTitleProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../foundation/styles';
import { useOverlayChromeContext } from './OverlayChrome';

/** Renders the enclosing dialog's accessible name, carrying the `id` its `aria-labelledby` names. */
defineOptions({ name: 'OverlayTitle', inheritAttrs: false });

/** The title text — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const context = useOverlayChromeContext();
const el = useTemplateRef<HTMLHeadingElement>('el');

const classes = computed(() =>
  cn('text-lg font-semibold leading-none text-foreground', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- `id` sits before `v-bind`, so a caller-supplied `id` still wins — React's prop order. -->
  <h2 ref="el" :id="context.titleId" v-bind="rest" :class="classes"><slot /></h2>
</template>
