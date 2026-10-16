<script lang="ts">
import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue';
import type { Placement } from '@floating-ui/vue';

/**
 * The value shared with `PopoverTrigger` / `PopoverContent`.
 *
 * React carried the trigger twice — a ref for imperative focus and a state copy
 * so an initially-open popover re-rendered anchored. A `shallowRef` is already
 * reactive, so one field covers both here.
 */
export interface PopoverContextValue {
  /** The resolved open state. Writable — an assignment routes through `setOpen`. */
  open: Ref<boolean>;
  setOpen: (open: boolean) => void;
  /** The trigger element — the positioning anchor and the focus-return target. */
  triggerEl: ShallowRef<HTMLElement | null>;
  placement: ComputedRef<Placement>;
  offset: ComputedRef<number>;
  isModal: ComputedRef<boolean>;
  dismissOnOutsideClick: ComputedRef<boolean>;
  dismissOnEscape: ComputedRef<boolean>;
}

export const popoverContextKey: InjectionKey<PopoverContextValue> = Symbol('wow-two.popover');

export function usePopoverContext(): PopoverContextValue {
  const context = inject(popoverContextKey, null);
  if (!context) throw new Error('Popover.* must be used inside <Popover>');
  return context;
}

/** Controlled axes use their canonical Vue model names; each update event requests caller state. */
export interface PopoverProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The Floating UI placement. Default `bottom`. */
  readonly placement?: Placement;

  /** The distance between anchor and panel in px. Default 8. */
  readonly offset?: number;

  /** Whether the panel is modal and traps focus. Default false. */
  readonly isModal?: boolean;

  /** The outside-click dismissal toggle. Default `true`. */
  readonly canDismissOnOutsideClick?: boolean;
  /** @deprecated Use `canDismissOnOutsideClick`; this alias is removed next release. */
  readonly dismissOnOutsideClick?: boolean;

  /** The Escape dismissal toggle. Default `true`. */
  readonly canDismissOnEscape?: boolean;
  /** @deprecated Use `canDismissOnEscape`; this alias is removed next release. */
  readonly dismissOnEscape?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, shallowRef } from 'vue';
import { useControlled } from '../../../foundation/state';

/**
 * Renders only its slot, owning the open state and placement of the Popover tree below it.
 * React returned a bare context Provider, which has no element of its own.
 */
defineOptions({ name: 'Popover', inheritAttrs: false });

/** The Popover tree — `PopoverTrigger` and `PopoverContent`. React's `children`. */
defineSlots<{ default(): unknown }>();

/** `open` default to `undefined` so an absent prop cannot read as an explicit `false`. */
const props = withDefaults(defineProps<PopoverProps>(), {
  open: undefined,
  defaultOpen: false,
  placement: 'bottom',
  offset: 8,
  isModal: false,
  canDismissOnOutsideClick: undefined,
  dismissOnOutsideClick: undefined,
  canDismissOnEscape: undefined,
  dismissOnEscape: undefined,
});

const emit = defineEmits<{
  /** Fires when the popover opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const triggerEl = shallowRef<HTMLElement | null>(null);

provide(popoverContextKey, {
  open: controlled.value,
  setOpen: controlled.setValue,
  triggerEl,
  placement: computed(() => props.placement),
  offset: computed(() => props.offset),
  isModal: computed(() => props.isModal),
  dismissOnOutsideClick: computed(() => props.canDismissOnOutsideClick ?? props.dismissOnOutsideClick ?? true),
  dismissOnEscape: computed(() => props.canDismissOnEscape ?? props.dismissOnEscape ?? true),
});
</script>

<template>
  <slot />
</template>
