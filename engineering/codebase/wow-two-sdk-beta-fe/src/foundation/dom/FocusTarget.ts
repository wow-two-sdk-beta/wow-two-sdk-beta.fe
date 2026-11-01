/**
 * Marks an element that script focuses without it being a control — a page's `main` after a route change, a
 * heading, a region that holds focus while its content swaps. The base styles (`index.css`) draw no focus ring on
 * a marked element: a ring around a whole page or card points at nothing the reader can operate, and a screen
 * reader still lands on it and reads it.
 */
export const FocusTargetAttribute = 'data-focus-target';

/**
 * Focuses `element` as a programmatic focus target: gives it `tabindex="-1"` when it has no tabindex of its own
 * (focusable by script, never a Tab stop), marks it with {@link FocusTargetAttribute} and focuses it without
 * scrolling. Returns whether the element now holds focus.
 */
export function focusTarget(element: HTMLElement): boolean {
  if (!element.hasAttribute('tabindex')) element.tabIndex = -1;
  element.setAttribute(FocusTargetAttribute, '');
  element.focus({ preventScroll: true });
  return element.ownerDocument.activeElement === element;
}
