<script lang="ts">
export interface NavigationMenuItemProps {
  /** The stable id for active-state tracking. Required when item has a Trigger + Content. */
  readonly value: string;
}
</script>

<script setup lang="ts">
import { computed, provide, shallowRef, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import { navigationMenuItemContextKey, useNavigationMenuContext } from './NavigationMenuContext';

/** Renders one `<li>` of the strip, pairing a trigger or link with its content panel. */
defineOptions({ name: 'NavigationMenuItem', inheritAttrs: false });

/** The trigger / link and optional content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = defineProps<NavigationMenuItemProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLLIElement>('el');
const nav = useNavigationMenuContext();

provide(navigationMenuItemContextKey, {
  get value() {
    return props.value;
  },
  open: computed(() => nav.activeId.value === props.value),
  triggerEl: shallowRef<HTMLElement | null>(null),
  contentId: useId(),
  triggerId: useId(),
});

/* `list-none` is load-bearing, not cosmetic. `NavigationMenuList` renders a `<div
   role="list">` (it wraps `RovingFocusGroup`), so this `<li>` has no `ul`/`ol`
   parent — and Tailwind preflight only resets `list-style` on `ul`/`ol`. The
   orphan keeps the UA's `list-item` display and drew a disc: `• Products ⌄`. */
const classes = computed(() => cn('relative list-none', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- `role` sits before `v-bind="rest"` so a consumer-supplied one wins. An `<li>`
       only maps to `listitem` under a `ul`/`ol`/`menu` parent; under the list div it
       would leave `role="list"` with no children, so the role is stated. -->
  <li ref="el" role="listitem" v-bind="rest" :class="classes"><slot /></li>
</template>
