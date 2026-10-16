import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

const FocusableSelector = 'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]';

function isVisible(el: HTMLElement): boolean {
  // checkVisibility covers display/visibility/content-visibility; the
  // getClientRects fallback (older engines) still includes position:fixed
  // elements, which `offsetParent !== null` would wrongly exclude.
  return (
    el.checkVisibility?.({ visibilityProperty: true, contentVisibilityAuto: true }) ?? el.getClientRects().length > 0
  );
}

function getFocusable(container: HTMLElement): ReadonlyArray<HTMLElement> {
  return Array.from(container.querySelectorAll<HTMLElement>(FocusableSelector)).filter(
    (el) =>
      (!el.hasAttribute('tabindex') || el.tabIndex >= 0) &&
      !el.matches(':disabled,input[type="hidden"]') &&
      !el.closest('[hidden],[inert],[aria-hidden="true"]') &&
      isVisible(el),
  );
}

/**
 * Trap Tab / Shift+Tab focus inside the referenced element. Once the element
 * exists, focuses the first focusable child (unless already focused inside).
 * When the trap tears down — the element unmounts, `enabled` flips, or the
 * scope is disposed — focus returns to the element that had it beforehand.
 *
 * Takes the element as a ref or getter rather than handing one back, so the
 * caller keeps ownership of its `useTemplateRef`. The effect is post-flush,
 * so the element is in the DOM by the time the trap arms.
 *
 * For richer behavior (sentinels, nested traps), wrap `FocusScope` instead —
 * this composable is the lower primitive.
 */
export function useFocusTrap(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
): void {
  watchPostEffect((onCleanup) => {
    const container = toValue(target);
    if (!toValue(enabled) || !container) return;
    const document = container.ownerDocument;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const previousTabIndex = container.getAttribute('tabindex');
    let tabIndexMutated = false;

    const focusables = getFocusable(container);
    if (focusables.length > 0 && !container.contains(document.activeElement)) {
      focusables[0]?.focus();
    } else if (focusables.length === 0) {
      container.tabIndex = -1;
      tabIndexMutated = true;
      container.focus();
    }

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab' || e.defaultPrevented) return;
      const items = getFocusable(container);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    onCleanup(() => {
      container.removeEventListener('keydown', onKeyDown);
      if (tabIndexMutated) {
        if (previousTabIndex === null) container.removeAttribute('tabindex');
        else container.setAttribute('tabindex', previousTabIndex);
      }
      if (previouslyFocused?.isConnected && !previouslyFocused.closest('[inert]')) previouslyFocused.focus?.();
    });
  });
}
