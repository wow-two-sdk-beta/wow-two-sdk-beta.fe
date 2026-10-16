// Domain-internal helpers for `nav/`. Not exported from the group barrel —
// the "internal" signal is absence from `index.ts`, not the file name.

/** Extends `nav/` with the DOM-node reads its triggers share. */
export const NavExtensions = {
  /**
   * The DOM node behind a template ref, or `null`.
   *
   * The `typeof` guard is load-bearing rather than defensive. Every trigger here
   * seeds its anchor element from a `watch(..., { immediate: true, flush: 'post' })`,
   * and Vue runs an *immediate* watcher once during SSR — where `HTMLElement` is
   * not a global, so a bare `value instanceof HTMLElement` throws `ReferenceError`
   * and takes the whole server render down. Returning `null` on the server is
   * correct as well as safe: there is no element to anchor to until hydration.
   */
  toHtmlElement(value: unknown): HTMLElement | null {
    const node = value as HTMLElement | null;
    const elementType = node?.ownerDocument?.defaultView?.HTMLElement;
    return elementType && node instanceof elementType ? node : null;
  },
  /** Native and ARIA inactive controls cannot open menus or receive roving focus. */
  isDisabled(node: HTMLElement | null): boolean {
    return !node || node.matches(':disabled,[aria-disabled="true"],[data-disabled]');
  },
} as const;
