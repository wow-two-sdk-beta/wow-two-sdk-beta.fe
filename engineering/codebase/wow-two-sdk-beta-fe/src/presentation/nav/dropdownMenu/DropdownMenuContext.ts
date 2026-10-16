import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue';
import type { Placement } from '@floating-ui/vue';

/**
 * The value shared with `DropdownMenuTrigger` / `DropdownMenuContent`.
 *
 * React carried the trigger twice — a ref for imperative focus and a state copy
 * so anchored content re-rendered once the ref attached. A `shallowRef` is
 * already reactive, so one field covers both here.
 */
export interface DropdownMenuContextValue {
  /** The resolved open state. Writable — an assignment routes through `setOpen`. */
  open: Ref<boolean>;
  setOpen: (open: boolean) => void;

  /** The trigger element — the positioning anchor and the focus-return target. */
  triggerEl: ShallowRef<HTMLElement | null>;

  /**
   * Which item takes focus on open — the trigger arms it per gesture
   * (APG menu-button pattern: ArrowUp → last). A plain mutable box, not a ref:
   * it is a one-shot signal between two handlers, never rendered.
   */
  openFocus: { current: 'first' | 'last' };

  placement: ComputedRef<Placement>;
  offset: ComputedRef<number>;
}

export const dropdownMenuContextKey: InjectionKey<DropdownMenuContextValue> = Symbol('wow-two.dropdownMenu');

export function useDropdownMenuContext(): DropdownMenuContextValue {
  const context = inject(dropdownMenuContextKey, null);
  if (!context) throw new Error('DropdownMenu.* must be used inside <DropdownMenu>');
  return context;
}
