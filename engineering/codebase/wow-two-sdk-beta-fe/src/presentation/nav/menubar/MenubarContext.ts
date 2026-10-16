import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue';

/** One registered menu trigger — the unit `moveAcross` walks. */
export interface MenubarTriggerEntry {
  id: string;
  el: HTMLButtonElement | null;
}

/** The bar-level seam: which menu is open, and how focus moves between triggers. */
export interface MenubarContextValue {
  /** The id of the currently-open menu, or `null` if none. */
  activeId: Ref<string | null>;
  setActiveId: (id: string | null) => void;

  registerTrigger: (id: string, el: HTMLButtonElement | null) => void;
  unregisterTrigger: (id: string) => void;

  /** Focuses the trigger adjacent to `fromId`; switches the open menu when one is open. */
  moveAcross: (fromId: string, direction: 1 | -1) => void;
}

export const menubarContextKey: InjectionKey<MenubarContextValue> = Symbol('wow-two.menubar');

export function useMenubarContext(): MenubarContextValue {
  const context = inject(menubarContextKey, null);
  if (!context) throw new Error('Menubar.* must be used inside <Menubar>');
  return context;
}

/**
 * The per-menu seam.
 *
 * React carried the trigger twice — a ref for imperative focus and a state copy
 * so anchored content re-rendered once the ref attached. A `shallowRef` is
 * already reactive, so one field covers both here.
 */
export interface MenubarMenuContextValue {
  id: string;
  open: ComputedRef<boolean>;
  setOpen: (open: boolean) => void;

  /** The trigger element — the positioning anchor and the focus-return target. */
  triggerEl: ShallowRef<HTMLButtonElement | null>;
}

export const menubarMenuContextKey: InjectionKey<MenubarMenuContextValue> = Symbol('wow-two.menubarMenu');

export function useMenubarMenuContext(): MenubarMenuContextValue {
  const context = inject(menubarMenuContextKey, null);
  if (!context) throw new Error('MenubarTrigger / MenubarContent must be used inside <MenubarMenu>');
  return context;
}
