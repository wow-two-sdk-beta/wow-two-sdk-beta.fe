<script lang="ts">
import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue';
import type { Side } from '../../../foundation/styles';

/**
 * The value shared with `DrawerTrigger` / `DrawerContent`.
 *
 * React's context held plain values re-created on every render; here the
 * reactive fields stay refs so a child reads the live value without the root
 * re-rendering it.
 */
export interface DrawerContextValue {
  /** The resolved open state. Writable — an assignment routes through `setOpen`. */
  open: Ref<boolean>;
  setOpen: (open: boolean) => void;
  /** The trigger element — the focus-return target when the drawer closes. */
  triggerEl: ShallowRef<HTMLElement | null>;
  titleId: string;
  descriptionId: string;
  side: ComputedRef<Side>;
  dismissOnOutsideClick: ComputedRef<boolean>;
  dismissOnEscape: ComputedRef<boolean>;
}

export const drawerContextKey: InjectionKey<DrawerContextValue> = Symbol('wow-two.drawer');

export function useDrawerContext(): DrawerContextValue {
  const context = inject(drawerContextKey, null);
  if (!context) throw new Error('Drawer.* must be used inside <Drawer>');
  return context;
}

/** Controlled axes use their canonical Vue model names; each update event requests caller state. */
export interface DrawerProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The edge the panel slides in from. Default `right`. */
  readonly side?: Side;

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
import { useId } from '../../../foundation/identifiers';

/**
 * Renders only its slot, owning the open state and a11y ids of the Drawer tree below it.
 * React returned a bare context Provider, which has no element of its own.
 */
defineOptions({ name: 'Drawer', inheritAttrs: false });

/** The Drawer tree — `DrawerTrigger` and `DrawerContent`. React's `children`. */
defineSlots<{ default(): unknown }>();

/**
 * `open: undefined` / `open: undefined` are load-bearing: Vue coerces an
 * absent `Boolean` prop to `false` unless the declaration *owns* a `default`
 * key, which would strand the uncontrolled path behind a permanently-closed
 * controlled one.
 */
const props = withDefaults(defineProps<DrawerProps>(), {
  open: undefined,
  defaultOpen: false,
  side: 'right',
  canDismissOnOutsideClick: undefined,
  dismissOnOutsideClick: undefined,
  canDismissOnEscape: undefined,
  dismissOnEscape: undefined,
});

const emit = defineEmits<{
  /** Fires when the drawer opens or closes — the `v-model:open` half. */
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
const titleId = useId('drawer-title');
const descriptionId = useId('drawer-description');

provide(drawerContextKey, {
  open: controlled.value,
  setOpen: controlled.setValue,
  triggerEl,
  titleId,
  descriptionId,
  side: computed(() => props.side),
  dismissOnOutsideClick: computed(() => props.canDismissOnOutsideClick ?? props.dismissOnOutsideClick ?? true),
  dismissOnEscape: computed(() => props.canDismissOnEscape ?? props.dismissOnEscape ?? true),
});
</script>

<template>
  <slot />
</template>
