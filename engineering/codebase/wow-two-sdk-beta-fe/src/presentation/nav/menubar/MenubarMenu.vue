<script lang="ts">
export interface MenubarMenuProps {
  /** The stable id for this menu — used for active-menu tracking. */
  readonly value: string;
}
</script>

<script setup lang="ts">
import { computed, provide, shallowRef } from 'vue';
import { menubarMenuContextKey, useMenubarContext } from './MenubarContext';

/**
 * Renders only its slot, pairing one `MenubarTrigger` with its `MenubarContent`.
 * React returned a bare context Provider, which has no element of its own.
 */
defineOptions({ name: 'MenubarMenu', inheritAttrs: false });

/** The `MenubarTrigger` and `MenubarContent` pair — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = defineProps<MenubarMenuProps>();

const bar = useMenubarContext();

provide(menubarMenuContextKey, {
  get id() {
    return props.value;
  },
  open: computed(() => bar.activeId.value === props.value),
  setOpen: (next: boolean) => bar.setActiveId(next ? props.value : null),
  triggerEl: shallowRef<HTMLButtonElement | null>(null),
});
</script>

<template>
  <slot />
</template>
