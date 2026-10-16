<script lang="ts">
import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue';
import type { Placement } from '@floating-ui/vue';

/** The value shared with `HoverCardTrigger` / `HoverCardContent`. */
export interface HoverCardContextValue {
  /** The resolved open state. Writable — an assignment routes through `setOpen`. */
  open: Ref<boolean>;
  setOpen: (open: boolean) => void;
  /** The trigger element — the positioning anchor. */
  triggerEl: ShallowRef<HTMLElement | null>;
  /** Opens after `openDelay`. */
  show: () => void;
  /** Closes after `closeDelay`. */
  hide: () => void;
  /** Cancels a pending close — the pointer moved onto the card. */
  cancelHide: () => void;
  placement: ComputedRef<Placement>;
  offset: ComputedRef<number>;
}

export const hoverCardContextKey: InjectionKey<HoverCardContextValue> = Symbol('wow-two.hoverCard');

export function useHoverCardContext(): HoverCardContextValue {
  const context = inject(hoverCardContextKey, null);
  if (!context) throw new Error('HoverCard.* must be used inside <HoverCard>');
  return context;
}

/** Controlled axes use their canonical Vue model names; each update event requests caller state. */
export interface HoverCardProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The hover dwell before opening, in ms. Default 700. */
  readonly openDelay?: number;

  /** The grace period before closing, in ms. Default 300. */
  readonly closeDelay?: number;

  /** The Floating UI placement. Default `bottom`. */
  readonly placement?: Placement;

  /** The distance between anchor and card in px. Default 8. */
  readonly offset?: number;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, provide, shallowRef } from 'vue';
import { useControlled } from '../../../foundation/state';
import { useEscape } from '../../../foundation/shortcuts';

/**
 * Renders only its slot, owning the open state and hover timing of the HoverCard tree below it.
 * React returned a bare context Provider, which has no element of its own.
 */
defineOptions({ name: 'HoverCard', inheritAttrs: false });

/** The HoverCard tree — `HoverCardTrigger` and `HoverCardContent`. React's `children`. */
defineSlots<{ default(): unknown }>();

/** `open` default to `undefined` so an absent prop cannot read as an explicit `false`. */
const props = withDefaults(defineProps<HoverCardProps>(), {
  open: undefined,
  defaultOpen: false,
  openDelay: 700,
  closeDelay: 300,
  placement: 'bottom',
  offset: 8,
});

const emit = defineEmits<{
  /** Fires when the card opens or closes — the `v-model:open` half. */
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

let openTimer: ReturnType<typeof setTimeout> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function clear(): void {
  if (openTimer) clearTimeout(openTimer);
  if (closeTimer) clearTimeout(closeTimer);
  openTimer = null;
  closeTimer = null;
}

function show(): void {
  clear();
  openTimer = setTimeout(() => controlled.setValue(true), props.openDelay);
}

function hide(): void {
  clear();
  closeTimer = setTimeout(() => controlled.setValue(false), props.closeDelay);
}

function cancelHide(): void {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

/* Clear pending timers on teardown — React's `useEffect(() => clear, …)`. */
onScopeDispose(clear);

// WCAG 1.4.13 — hover content must be dismissible without moving the pointer.
useEscape(
  () => {
    clear();
    controlled.setValue(false);
  },
  () => controlled.value.value,
);

provide(hoverCardContextKey, {
  open: controlled.value,
  setOpen: controlled.setValue,
  triggerEl,
  show,
  hide,
  cancelHide,
  placement: computed(() => props.placement),
  offset: computed(() => props.offset),
});
</script>

<template>
  <slot />
</template>
