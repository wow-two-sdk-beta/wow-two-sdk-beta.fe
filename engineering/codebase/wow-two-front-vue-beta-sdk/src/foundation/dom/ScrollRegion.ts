/**
 * Marks an element that scrolls in place of the window — `AppShellMain` in a `region` shell carries it.
 * The app router saves, restores and resets every marked element's scroll across navigations, as it does
 * the window's. Mark a custom scroll container with `{ [ScrollRegionAttribute]: '' }`.
 */
export const ScrollRegionAttribute = 'data-scroll-region';

/** Returns every marked scroll region in document order; none without a document (SSR). */
export function findScrollRegions(root: ParentNode | undefined = globalThis.document): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(`[${ScrollRegionAttribute}]`));
}
