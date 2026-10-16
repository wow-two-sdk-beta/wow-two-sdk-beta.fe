import { inject, type ComputedRef, type InjectionKey } from 'vue';
import type { NavbarOrientation } from './Navbar.variants';

/** What a `Navbar` shares with the navigation items inside it. */
export interface NavbarContext {
  /** Which way the bar runs — a `NavItem` sizes to its label in a top bar and fills the row in a rail. */
  readonly orientation: ComputedRef<NavbarOrientation>;
}

export const navbarContextKey: InjectionKey<NavbarContext> = Symbol('wow-two.navbar');

/**
 * Marks a subtree that already renders the page's banner landmark (`AppShellHeader`). A `Navbar` inside it renders a
 * plain row instead of a second `<header>` and leaves the band's border and surface to the host.
 */
export const bannerHostKey: InjectionKey<true> = Symbol('wow-two.bannerHost');

/** Reads the nearest `Navbar`, or `null` outside one. */
export function useNavbar(): NavbarContext | null {
  return inject(navbarContextKey, null);
}
