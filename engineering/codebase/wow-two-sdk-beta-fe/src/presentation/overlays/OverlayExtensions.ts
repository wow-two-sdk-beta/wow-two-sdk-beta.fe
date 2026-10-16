// Domain-internal helpers for `overlays/`. Not exported from the group barrel —
// the "internal" signal is absence from `index.ts`, not the file name.

import { resolveElement } from '../../foundation/dom';

/** Extends `overlays/` with the DOM-node reads its triggers and panels share. */
export const OverlayExtensions = {
  /**
   * The DOM node behind a template ref, or `null`.
   *
   * The `typeof` guard is load-bearing rather than defensive. Every overlay seeds
   * its trigger element from a `watch(..., { immediate: true, flush: 'post' })`,
   * and Vue runs an *immediate* watcher once during SSR — where `HTMLElement` is
   * not a global, so a bare `value instanceof HTMLElement` throws `ReferenceError`
   * and takes the whole server render down. Returning `null` on the server is
   * correct as well as safe: there is no element to anchor to until hydration.
   */
  toHtmlElement(value: unknown): HTMLElement | null {
    if (typeof HTMLElement === 'undefined') return null;
    /* `resolveElement` also steps past a fragment's start anchor: an `as-child` trigger wrapping a component whose
       template opens with a comment has that anchor as its `$el` in a development build. */
    return resolveElement(value);
  },
} as const;
