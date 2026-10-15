<script lang="ts">
/**
 * The prop surface of `AppShellMain`.
 *
 * React declared `HTMLAttributes<HTMLElement>`; attributes reach the root
 * through `useAttrs` here and `children` is the default slot, which leaves no
 * declared prop.
 */
export type AppShellMainProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue';
import { ScrollRegionAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { appShellContextKey, AppShellScroll } from './AppShell.vue';

/**
 * Renders the primary column into the `main` grid area — also the skip-link's target.
 *
 * `id` and `tabindex` are bound before `v-bind="rest"` so a caller-supplied
 * value still wins, matching React's attribute-then-spread order.
 */
defineOptions({ name: 'AppShellMain', inheritAttrs: false });

/** The page content — React's `children`. */
defineSlots<{ default?(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

/* Optional: a main region rendered outside a shell keeps the document's scrolling. */
const context = inject(appShellContextKey, null);

const isRegion = computed(() => context?.scroll.value === AppShellScroll.Region);

/* The app router saves, restores and resets a marked region's scroll as it does the window's. */
const regionAttrs = computed(() => (isRegion.value ? { [ScrollRegionAttribute]: '' } : {}));

/* In a region shell this is the one scroll container; its gutter is reserved so opening a panel never shifts
   the layout sideways. */
const classes = computed(() =>
  cn(
    'flex flex-col [grid-area:main] focus:outline-hidden',
    isRegion.value && 'min-h-0 overflow-y-auto [scrollbar-gutter:stable]',
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
  <main ref="el" id="app-shell-main" tabindex="-1" v-bind="{ ...regionAttrs, ...rest }" :class="classes">
    <slot />
  </main>
</template>
