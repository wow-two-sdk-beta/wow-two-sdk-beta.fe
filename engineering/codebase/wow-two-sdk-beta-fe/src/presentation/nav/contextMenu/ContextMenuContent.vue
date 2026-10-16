<script lang="ts">
import type { Placement } from '@floating-ui/vue';

/**
 * The prop surface of `ContextMenuContent`.
 *
 * React declared `className` and `'aria-label'` alongside these; both are
 * fallthrough attrs here and are relayed to `Menu`, which lands `aria-label` on
 * the menu surface. A declared `'aria-label'` would arrive as `props.ariaLabel`
 * and never render, so it stays an attr. `placement` is `Placement` rather than
 * an indexed access into `MenuProps`, which the SFC compiler cannot resolve.
 */
export interface ContextMenuContentProps {
  /** The Floating UI placement. Default `bottom-start`. */
  readonly placement?: Placement;

  /** The distance between the gesture point and the menu in px. Default 2. */
  readonly offset?: number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '../../../foundation/styles';
import Menu from '../menu/Menu.vue';
import { useContextMenuContext } from './ContextMenuContext';

/** Renders the menu surface, anchored to the point the gesture happened at. */
defineOptions({ name: 'ContextMenuContent', inheritAttrs: false });

/** The menu contents — React's `children`. */
defineSlots<{ default(): unknown }>();

/* Not bound to a `props` const: with every reference now in the template — where the bare
   name compiles to `$props`, which survives a setup throw — the binding would be unused. */
withDefaults(defineProps<ContextMenuContentProps>(), {
  placement: 'bottom-start',
  offset: 2,
});

const attrs = useAttrs();
const context = useContextMenuContext();

/* Lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isOpen = context.open;
const anchor = context.anchor;

/* Enter-only pop: the surface mounts when `open` flips true, so the anim fires
   once on mount. motion-safe gates it for reduced-motion. (Exit anim is owned by
   the shared `Menu`'s Presence gate.) */
const classes = computed(() => cn('motion-safe:animate-(--animate-pop-in)', attrs.class as string | undefined));

/** Everything but `class` — relayed to `Menu`, which lands `aria-label` on the surface. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <Menu
    :open="isOpen"
    :anchor="anchor"
    :return-focus="() => context.restoreFocus.current"
    :placement="placement"
    :offset="offset"
    v-bind="rest"
    :class="classes"
    @update:open="context.setOpen(false)"
  >
    <slot />
  </Menu>
</template>
