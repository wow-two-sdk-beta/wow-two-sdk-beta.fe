import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useEventListener } from './UseEventListener';

/** The attribute that marks an element while its content scrolls; the `scrollbar-auto-hide` styles read it. */
export const ScrollingAttribute = 'data-scrolling';

/** The pause after the last scroll event before an element counts as idle again, in milliseconds. */
export const ScrollIdleDelay = 800;

type Target = HTMLElement | null | undefined;

/**
 * Marks `target` with `data-scrolling` while it scrolls and removes the mark `ScrollIdleDelay` after the last
 * scroll event — the signal a `scrollbar-auto-hide` element needs to show its thumb on touch devices, where no
 * pointer hovers it. The attribute is written on the element itself, so a scroll never re-renders the component
 * that owns it. `isEnabled` gates the whole behaviour: while it is `false` nothing is marked, and turning it off
 * clears a mark already set.
 */
export function useScrollActivity(target: MaybeRefOrGetter<Target>, isEnabled: MaybeRefOrGetter<boolean> = true): void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clear(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    toValue(target)?.removeAttribute(ScrollingAttribute);
  }

  useEventListener(
    'scroll',
    () => {
      const element = toValue(target);
      if (!element || !toValue(isEnabled)) return;
      element.setAttribute(ScrollingAttribute, '');
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(clear, ScrollIdleDelay);
    },
    target,
    { passive: true },
  );

  watch(
    () => toValue(isEnabled),
    (enabled) => {
      if (!enabled) clear();
    },
  );

  onScopeDispose(clear);
}
