<script lang="ts">
import type { Placement } from '@floating-ui/vue';

/**
 * The prop surface of `MenubarContent`.
 *
 * React declared `className` and `'aria-label'` alongside these; both are
 * fallthrough attrs here and are relayed to `Menu`, which merges `class` and
 * lands `aria-label` on the menu surface. A declared `'aria-label'` would arrive
 * as `props.ariaLabel` and never render, so it stays an attr. `placement` is
 * `Placement` rather than an indexed access into `MenuProps`, which the SFC
 * compiler cannot resolve.
 */
export interface MenubarContentProps {
  /** The Floating UI placement. Default `bottom-start`. */
  readonly placement?: Placement;

  /** The distance between trigger and menu in px. Default 4. */
  readonly offset?: number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Menu from '../menu/Menu.vue';
import { useMenubarContext, useMenubarMenuContext } from './MenubarContext';

/** Renders the menu surface for one bar entry. */
defineOptions({ name: 'MenubarContent', inheritAttrs: false });

/** The menu contents — React's `children`. */
defineSlots<{ default(): unknown }>();

/* Not bound to a `props` const: with every reference now in the template — where the bare
   name compiles to `$props`, which survives a setup throw — the binding would be unused. */
withDefaults(defineProps<MenubarContentProps>(), {
  placement: 'bottom-start',
  offset: 4,
});

const attrs = useAttrs();
const bar = useMenubarContext();
const menu = useMenubarMenuContext();

/* Lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isOpen = menu.open;
const anchor = computed(() => menu.triggerEl.value);

function handleClose(): void {
  menu.setOpen(false);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing) return;
  // Arrow across menus while a popup is open — close current, open adjacent.
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      bar.moveAcross(menu.id, 1);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      bar.moveAcross(menu.id, -1);
      break;
  }
}
</script>

<template>
  <!-- `v-bind="attrs"` carries `class` and `aria-label` straight to `Menu`, which
       merges the first through `cn` and lands the second on the surface. -->
  <Menu
    :open="isOpen"
    :anchor="anchor"
    :placement="placement"
    :offset="offset"
    v-bind="attrs"
    @update:open="handleClose"
    @keydown="handleKeydown"
  >
    <slot />
  </Menu>
</template>
