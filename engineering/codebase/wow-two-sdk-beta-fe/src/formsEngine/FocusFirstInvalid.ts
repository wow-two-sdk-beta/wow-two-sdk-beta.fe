import { AriaAttribute } from '../foundation/dom';

/*
 * Focus-first-invalid — the submit-rejection a11y hop (docs/analysis/forms-vector-next.md F-2e).
 * Contract-neutral by construction: it reads the `aria-invalid="true"` the FormControlContext
 * glue stamps on every wired control, so it behaves identically on every engine adapter
 * (house, tanstack) and for client AND server errors — anything that flips a field invalid.
 * DOM order = visual order, so "first" matches what the user sees.
 */

/**
 * Focuses the first invalid, focusable control inside `root` and returns it (`null` when
 * nothing qualifies — the form is valid, or every invalid control is disabled/hidden).
 *
 * `handleSubmit(event)` integrates this after a failed manual attempt. Imperative callers can
 * provide `focusRoot`; a focusable `[data-form-error-summary]` is its fallback. This helper
 * remains available for custom orchestration.
 */
export function focusFirstInvalid(root: ParentNode | null | undefined): HTMLElement | null {
  if (!root) return null;
  for (const candidate of root.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
    // Disabled controls (native or ARIA widget) never take focus — skip to the next invalid one.
    if (candidate.closest('[inert], [hidden], [aria-hidden="true"]')) continue;
    if (candidate.matches(':disabled') || candidate.getAttribute(AriaAttribute.Disabled) === 'true') continue;
    // Focusable = in the tab order: native controls default 0; ARIA widgets need an explicit tabindex.
    if (candidate.tabIndex < 0) continue;
    candidate.focus();
    // `focus()` silently no-ops on undisplayed nodes — only a verified move counts.
    if (candidate.ownerDocument.activeElement === candidate) return candidate;
  }
  return null;
}
