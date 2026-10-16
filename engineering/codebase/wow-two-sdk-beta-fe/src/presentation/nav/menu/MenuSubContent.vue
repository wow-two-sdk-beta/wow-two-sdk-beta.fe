<script lang="ts">
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/**
 * Defines props for the submenu surface.
 *
 * The surface axes are spelled out rather than taken off `MenuProps`: the SFC compiler cannot
 * resolve an indexed access into another component's props.
 */
export interface MenuSubContentProps {
  /** The distance between the trigger row and the surface in px. Default 2. */
  readonly offset?: number;

  /** The visual recipe. Default `surface`. */
  readonly variant?: SurfaceVariant;

  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;

  /** The corner rounding. Default `md`. */
  readonly radius?: SurfaceRadius;

  /** The inner spacing step. Default `xs`. */
  readonly padding?: SurfacePadding;

  /** The shadow depth. */
  readonly elevation?: SurfaceElevation;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { Placement } from '@floating-ui/vue';
import Menu from './Menu.vue';
import { useMenuContext, useMenuSubContext } from './MenuContext';
import { MenuExtensions } from './MenuExtensions';

/**
 * Renders the submenu surface beside its trigger row while the `MenuSub` is open. Selecting a row or
 * pressing Tab closes the whole menu tree; Escape or the inline-start arrow closes this level and
 * returns focus to the trigger.
 */
defineOptions({ name: 'MenuSubContent', inheritAttrs: false });

/** The submenu rows. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<MenuSubContentProps>(), {
  offset: 2,
  variant: undefined,
  tone: undefined,
  radius: undefined,
  padding: undefined,
  elevation: undefined,
});

const attrs = useAttrs();
const parent = useMenuContext();
const sub = useMenuSubContext();

/* Lifted to a setup const so the template auto-unwraps it (a plain injected object does not). */
const isOpen = sub.open;

const anchor = computed(() => sub.triggerEl.value);

/** The side the surface opens on — the trigger row's inline end. */
const placement = computed<Placement>(() =>
  MenuExtensions.isRightToLeft(sub.triggerEl.value) ? 'left-start' : 'right-start',
);

/** Closes this level when the surface asks to close. */
function handleOpenChange(open: boolean): void {
  if (!open) sub.setOpen(false);
}

/** Holds the submenu open once the mouse reaches it. */
function handlePointerEnter(event: PointerEvent): void {
  if (MenuExtensions.isMousePointer(event)) parent.holdSubmenu();
}

/** Returns focus to the trigger row when this level closes while it owns focus. */
function triggerRow(): HTMLElement | null {
  return sub.triggerEl.value;
}
</script>

<template>
  <!-- Mounted only while open: a closed submenu keeps no positioner, focus scope or dismiss layer.
       The id and name are bound after the fallthrough set — the trigger's aria-controls points at them. -->
  <Menu
    v-if="isOpen"
    :open="isOpen"
    :anchor="anchor"
    :placement="placement"
    :offset="props.offset"
    :variant="props.variant"
    :tone="props.tone"
    :radius="props.radius"
    :padding="props.padding"
    :elevation="props.elevation"
    :return-focus="triggerRow"
    v-bind="attrs"
    :id="sub.contentId"
    :aria-labelledby="sub.triggerId"
    @update:open="handleOpenChange"
    @pointerenter="handlePointerEnter"
  >
    <slot />
  </Menu>
</template>
