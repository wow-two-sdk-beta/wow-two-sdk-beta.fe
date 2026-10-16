<script lang="ts">
import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue';

/** Defines the ARIA dialog role a `Modal` exposes. */
export const ModalRole = {
  /** Refers to a standard dialog. */
  Dialog: 'dialog',
  /** Refers to an alert dialog that interrupts to convey an urgent message. */
  AlertDialog: 'alertdialog',
} as const;

export type ModalRole = (typeof ModalRole)[keyof typeof ModalRole];

/**
 * The value shared with `ModalTrigger` / `ModalContent`.
 *
 * The reactive fields stay refs so a child reads the live value without the root
 * re-rendering it.
 */
export interface ModalContextValue {
  /** The resolved open state. Writable — an assignment routes through `setOpen`. */
  open: Ref<boolean>;
  setOpen: (open: boolean) => void;
  /** The trigger element — the focus-return target when the modal closes. */
  triggerEl: ShallowRef<HTMLElement | null>;
  titleId: string;
  descriptionId: string;
  role: ComputedRef<ModalRole>;
  dismissOnOutsideClick: ComputedRef<boolean>;
  dismissOnEscape: ComputedRef<boolean>;
}

export const modalContextKey: InjectionKey<ModalContextValue> = Symbol('wow-two.modal');

export function useModalContext(): ModalContextValue {
  const context = inject(modalContextKey, null);
  if (!context) throw new Error('Modal.* must be used inside <Modal>');
  return context;
}

/** Controlled axes use their canonical Vue model names; each update event requests caller state. */
export interface ModalProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The outside-click dismissal toggle. Default `true`. */
  readonly canDismissOnOutsideClick?: boolean;
  /** @deprecated Use `canDismissOnOutsideClick`; this alias is removed next release. */
  readonly dismissOnOutsideClick?: boolean;

  /** The Escape dismissal toggle. Default `true`. */
  readonly canDismissOnEscape?: boolean;
  /** @deprecated Use `canDismissOnEscape`; this alias is removed next release. */
  readonly dismissOnEscape?: boolean;

  /** The ARIA dialog role. Internal — `AlertModal` overrides this. */
  readonly role?: ModalRole;
}
</script>

<script setup lang="ts">
import { computed, provide, shallowRef } from 'vue';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';

/**
 * Renders only its slot, owning the open state and a11y ids of the Modal tree below it.
 * It has no element of its own.
 */
defineOptions({ name: 'Modal', inheritAttrs: false });

/** The Modal tree — `ModalTrigger` and `ModalContent`. */
defineSlots<{ default(): unknown }>();

/**
 * `open: undefined` / `open: undefined` are load-bearing: Vue coerces an
 * absent `Boolean` prop to `false` unless the declaration *owns* a `default`
 * key, which would make the modal read as explicitly-closed-and-controlled and
 * strand the uncontrolled path. Declaring the default as `undefined` keeps the
 * three states — absent / `true` / `false`.
 */
const props = withDefaults(defineProps<ModalProps>(), {
  open: undefined,
  defaultOpen: false,
  canDismissOnOutsideClick: undefined,
  dismissOnOutsideClick: undefined,
  canDismissOnEscape: undefined,
  dismissOnEscape: undefined,
  role: 'dialog',
});

const emit = defineEmits<{
  /** Fires when the dialog opens or closes — the `v-model:open` half. */
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
const titleId = useId('modal-title');
const descriptionId = useId('modal-description');

provide(modalContextKey, {
  open: controlled.value,
  setOpen: controlled.setValue,
  triggerEl,
  titleId,
  descriptionId,
  role: computed(() => props.role),
  dismissOnOutsideClick: computed(() => props.canDismissOnOutsideClick ?? props.dismissOnOutsideClick ?? true),
  dismissOnEscape: computed(() => props.canDismissOnEscape ?? props.dismissOnEscape ?? true),
});
</script>

<template>
  <slot />
</template>
