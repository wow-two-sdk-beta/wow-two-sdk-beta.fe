import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

/**
 * Fire `handler` when the Escape key is pressed at the document level.
 * For nested overlays, the topmost should call `event.stopPropagation()` in
 * its handler — `DismissableLayer` handles this stack-style.
 *
 * `enabled` may be a ref or a getter (`() => props.isOpen`); the listener
 * detaches and re-attaches as it flips.
 */
export function useEscape(handler: (event: KeyboardEvent) => void, enabled: MaybeRefOrGetter<boolean> = true): void {
  watchPostEffect((onCleanup) => {
    if (!toValue(enabled) || typeof document === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!e.isComposing && toValue(enabled) && e.key === 'Escape') handler(e);
    };
    document.addEventListener('keydown', onKeyDown);
    onCleanup(() => document.removeEventListener('keydown', onKeyDown));
  });
}
