<script lang="ts">
import type { Placement } from '@floating-ui/vue';

/** Controlled axes use their canonical Vue model names; each update event requests caller state. */
export interface DropdownMenuProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The Floating UI placement. Default `bottom-start`. */
  readonly placement?: Placement;

  /** The distance between trigger and menu in px. Default 6. */
  readonly offset?: number;
}
</script>

<script setup lang="ts">
import { computed, provide, shallowRef } from 'vue';
import { useControlled } from '../../../foundation/state';
import { dropdownMenuContextKey } from './DropdownMenuContext';

/**
 * Renders only its slot, owning the open state and placement of the DropdownMenu tree below.
 * React returned a bare context Provider, which has no element of its own.
 */
defineOptions({ name: 'DropdownMenu', inheritAttrs: false });

/** The DropdownMenu tree — `DropdownMenuTrigger` and `DropdownMenuContent`. React's `children`. */
defineSlots<{ default(): unknown }>();

/** `open` default to `undefined` so an absent prop cannot read as an explicit `false`. */
const props = withDefaults(defineProps<DropdownMenuProps>(), {
  open: undefined,
  defaultOpen: false,
  placement: 'bottom-start',
  offset: 6,
});

const emit = defineEmits<{
  /** Fires when the menu opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

provide(dropdownMenuContextKey, {
  open: controlled.value,
  setOpen: controlled.setValue,
  triggerEl: shallowRef<HTMLElement | null>(null),
  openFocus: { current: 'first' },
  placement: computed(() => props.placement),
  offset: computed(() => props.offset),
});
</script>

<template>
  <slot />
</template>
