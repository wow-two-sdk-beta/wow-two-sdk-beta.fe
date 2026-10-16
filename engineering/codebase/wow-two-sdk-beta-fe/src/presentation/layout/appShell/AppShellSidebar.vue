<script lang="ts">
import type { Breakpoint } from './AppShell.vue';

/**
 * The prop surface of `AppShellSidebar`.
 *
 * React declared `HTMLAttributes<HTMLElement>`; attributes reach the `aside`
 * through `useAttrs` here and `children` is the default slot, which leaves no
 * declared prop.
 */
export type AppShellSidebarProps = Record<string, never>;

// Complete class strings per breakpoint — Tailwind can't see interpolated names.
const SidebarStaticClasses: Record<Breakpoint, string> = {
  sm: 'hidden sm:flex',
  md: 'hidden md:flex',
  lg: 'hidden lg:flex',
  xl: 'hidden xl:flex',
  '2xl': 'hidden 2xl:flex',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import Drawer from '../../overlays/drawer/Drawer.vue';
import DrawerContent from '../../overlays/drawer/DrawerContent.vue';
import { AppShellScroll, useAppShellContext } from './AppShell.vue';

/**
 * Renders the side navigation rail — the `sidebar` grid area above
 * `sidebarBreakpoint`, a left-edge `Drawer` below it. The collapsed branch takes
 * only `class` (onto the `nav`), exactly as React's did; the rest of the attrs
 * belong to the `aside` that branch does not render.
 */
defineOptions({ name: 'AppShellSidebar', inheritAttrs: false });

/** The navigation content — React's `children`. */
defineSlots<{ default?(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
const context = useAppShellContext();

/* Refs lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isCollapsed = context.isSidebarCollapsed;
const isSidebarOpen = context.isSidebarOpen;

const asideClasses = computed(() =>
  cn(
    'overflow-y-auto border-r border-border bg-card [grid-area:sidebar]',
    context.scroll.value === AppShellScroll.Region ? 'min-h-0' : 'sticky top-14 h-[calc(100svh-3.5rem)]',
    SidebarStaticClasses[context.sidebarBreakpoint.value],
    attrs.class as string | undefined,
  ),
);

const navClasses = computed(() => cn('flex h-full flex-col', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** `null` in the collapsed branch — there is no `aside` then, as there was none in React. */
defineExpose({ el });
</script>

<template>
  <Drawer v-if="isCollapsed" :open="isSidebarOpen" side="left" @update:open="context.setSidebarOpen">
    <DrawerContent class="w-72 max-w-[80%]">
      <nav :class="navClasses"><slot /></nav>
    </DrawerContent>
  </Drawer>

  <aside v-else ref="el" v-bind="rest" :class="asideClasses">
    <nav class="flex h-full w-full flex-col p-3"><slot /></nav>
  </aside>
</template>
