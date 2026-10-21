<script lang="ts">
import type { NavbarVariant } from '../navbar/Navbar.variants';
import type { Breakpoint } from './AppShell.vue';

/** Represents the prop surface of `AppShellSidebar`; other attributes reach the `aside`. */
export interface AppShellSidebarProps {
  /**
   * The surface: `solid` (the theme's card fill, default), `glass` (the theme's sidebar glass, opaque where blur or
   * transparency is unavailable or reduced; the drawer below the breakpoint takes the menu glass) or `transparent`.
   */
  readonly variant?: NavbarVariant;
}

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
import { cn, SurfaceVariant } from '../../../foundation/styles';
import { NavbarVariant as NavbarVariantToken, SidebarSurfaceClass } from '../navbar/Navbar.variants';
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

const props = withDefaults(defineProps<AppShellSidebarProps>(), { variant: 'solid' });

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
const context = useAppShellContext();

/* Refs lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isCollapsed = context.isSidebarCollapsed;
const isSidebarOpen = context.isSidebarOpen;

const asideClasses = computed(() =>
  cn(
    'overflow-y-auto border-r border-border [grid-area:sidebar]',
    SidebarSurfaceClass[props.variant],
    context.scroll.value === AppShellScroll.Region ? 'min-h-0' : 'sticky top-14 h-[calc(100svh-3.5rem)]',
    SidebarStaticClasses[context.sidebarBreakpoint.value],
    attrs.class as string | undefined,
  ),
);

const navClasses = computed(() => cn('flex h-full flex-col', attrs.class as string | undefined));

/* A glass sidebar's drawer floats over the page like a menu, so it takes the menu strength. */
const drawerVariant = computed(() =>
  props.variant === NavbarVariantToken.Glass ? SurfaceVariant.GlassMenu : undefined,
);

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
    <DrawerContent class="w-72 max-w-[80%]" :variant="drawerVariant">
      <nav :class="navClasses"><slot /></nav>
    </DrawerContent>
  </Drawer>

  <aside v-else ref="el" v-bind="rest" :class="asideClasses">
    <nav class="flex h-full w-full flex-col p-3"><slot /></nav>
  </aside>
</template>
