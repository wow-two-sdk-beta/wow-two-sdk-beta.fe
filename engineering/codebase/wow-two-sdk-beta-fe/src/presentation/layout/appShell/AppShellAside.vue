<script lang="ts">
/**
 * The prop surface of `AppShellAside`.
 *
 * React declared `HTMLAttributes<HTMLElement>`; attributes reach the root
 * through `useAttrs` here and `children` is the default slot, which leaves no
 * declared prop.
 */
export type AppShellAsideProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, normalizeStyle, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { AppShellScroll, useAppShellContext } from './AppShell.vue';

/** Renders the right-hand rail inside `AppShellMain`, and nothing at all below `asideBreakpoint`. */
defineOptions({ name: 'AppShellAside', inheritAttrs: false });

/** The rail content — React's `children`. */
defineSlots<{ default?(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
const context = useAppShellContext();

/* Ref lifted to a setup const so the template auto-unwraps it (a plain injected object does not). */
const isHidden = context.isAsideHidden;

const classes = computed(() =>
  cn(
    'sticky shrink-0 overflow-y-auto border-l border-border bg-card p-4',
    /* In a region shell the main region scrolls under no header, so the rail pins to its top edge. */
    context.scroll.value === AppShellScroll.Region ? 'top-0 max-h-full' : 'top-14 h-[calc(100svh-3.5rem)]',
    attrs.class as string | undefined,
  ),
);

/** The width is normalized first so a caller's `style` still wins per-property. */
const asideStyle = computed(() => normalizeStyle([{ width: context.asideWidth.value }, attrs.style]));

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <aside v-if="!isHidden" ref="el" v-bind="rest" :style="asideStyle" :class="classes">
    <slot />
  </aside>
</template>
