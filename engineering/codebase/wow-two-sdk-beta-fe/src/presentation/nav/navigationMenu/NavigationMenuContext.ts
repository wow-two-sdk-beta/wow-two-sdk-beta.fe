import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue';

/** The root-level seam: which item's panel is open. */
export interface NavigationMenuContextValue {
  activeId: Ref<string | null>;
  setActiveId: (id: string | null) => void;
}

export const navigationMenuContextKey: InjectionKey<NavigationMenuContextValue> = Symbol('wow-two.navigationMenu');

export function useNavigationMenuContext(): NavigationMenuContextValue {
  const context = inject(navigationMenuContextKey, null);
  if (!context) throw new Error('NavigationMenu.* must be used inside <NavigationMenu>');
  return context;
}

/**
 * The per-item seam.
 *
 * React carried the trigger as a ref only and read `.current` from the content;
 * a `shallowRef` is reactive, so the anchored panel re-positions once the node
 * attaches without the extra state copy React needed.
 */
export interface NavigationMenuItemContextValue {
  value: string;
  open: ComputedRef<boolean>;
  triggerEl: ShallowRef<HTMLElement | null>;
  contentId: string;
  triggerId: string;
}

export const navigationMenuItemContextKey: InjectionKey<NavigationMenuItemContextValue> =
  Symbol('wow-two.navigationMenuItem');

export function useNavigationMenuItemContext(): NavigationMenuItemContextValue {
  const context = inject(navigationMenuItemContextKey, null);
  if (!context) {
    throw new Error('NavigationMenuTrigger / NavigationMenuContent must be used inside <NavigationMenuItem>');
  }
  return context;
}
