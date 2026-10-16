<script lang="ts">
/**
 * The prop surface of `AppShellFooter`.
 *
 * React declared `HTMLAttributes<HTMLElement>`; attributes reach the root
 * through `useAttrs` here and `children` is the default slot, which leaves no
 * declared prop.
 */
export type AppShellFooterProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/** Renders the shell's bottom bar into the `footer` grid area. */
defineOptions({ name: 'AppShellFooter', inheritAttrs: false });

/** The footer content — React's `children`. */
defineSlots<{ default?(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() =>
  cn(
    'border-t border-border bg-card px-4 py-3 text-sm text-muted-foreground [grid-area:footer]',
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
  <footer ref="el" role="contentinfo" v-bind="rest" :class="classes"><slot /></footer>
</template>
