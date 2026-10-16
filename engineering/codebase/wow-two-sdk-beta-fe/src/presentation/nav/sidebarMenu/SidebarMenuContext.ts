import { inject, type InjectionKey } from 'vue';

/** The state a `SidebarMenu` shares with its items, groups and sections. */
export interface SidebarMenuContextValue {
  /** Whether the menu shows as an icon rail. Live getter — read it, don't destructure it. */
  readonly isCollapsed: boolean;
}

export const SidebarMenuKey: InjectionKey<SidebarMenuContextValue> = Symbol('wow-two.sidebarMenu');

/** The state outside a `SidebarMenu` — the parts render expanded. */
const Standalone: SidebarMenuContextValue = { isCollapsed: false };

/** Reads the surrounding `SidebarMenu`; outside one, the parts render expanded. */
export function useSidebarMenuContext(): SidebarMenuContextValue {
  return inject(SidebarMenuKey, Standalone);
}
