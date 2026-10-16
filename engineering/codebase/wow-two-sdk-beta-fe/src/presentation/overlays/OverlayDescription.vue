<script lang="ts">
/**
 * The prop surface of `OverlayDescription`.
 *
 * React declared `extends HTMLAttributes<HTMLParagraphElement>` plus `children`;
 * attributes reach the root through `useAttrs` here and `children` is the
 * default slot, which leaves no declared prop.
 */
export type OverlayDescriptionProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../foundation/styles';
import { useOverlayChromeContext } from './OverlayChrome';

/** Renders the enclosing dialog's accessible description, carrying the `id` `aria-describedby` names. */
defineOptions({ name: 'OverlayDescription', inheritAttrs: false });

/** The description text — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const context = useOverlayChromeContext();
const el = useTemplateRef<HTMLParagraphElement>('el');

const classes = computed(() => cn('text-sm text-muted-foreground', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- `id` sits before `v-bind`, so a caller-supplied `id` still wins — React's prop order. -->
  <p ref="el" :id="context.descriptionId" v-bind="rest" :class="classes"><slot /></p>
</template>
