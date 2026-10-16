import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

import { getPasteItems, type PasteItems } from '../PasteItems';

/** Tunes a {@link usePasteHandler} binding. */
export interface UsePasteHandlerOptions {
  /**
   * The element to listen on. Defaults to `window`, which catches a paste anywhere on the page — the right
   * default for a drop-zone or an editor surface that is not itself focused. Pass a ref or getter to scope the
   * listener to one element.
   */
  readonly target?: MaybeRefOrGetter<HTMLElement | null | undefined>;

  /**
   * Whether the listener is attached. Defaults to `true`; pass `false` to suspend it without tearing down — a
   * modal that should own pastes only while open.
   */
  readonly enabled?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Whether to call `preventDefault()` on the event, suppressing the browser's own paste. Defaults to `false`.
   *
   * Turn it on when the handler fully owns the paste (inserting the image itself); leave it off when the handler
   * is a side effect and the default insert should still happen. Applied BEFORE the handler runs, so a throw
   * from the handler cannot skip it.
   */
  readonly preventDefault?: MaybeRefOrGetter<boolean | undefined>;
}

/**
 * Binds a `paste` listener that hands the handler the event's already-extracted text, HTML, and files.
 *
 * Needs no clipboard permission — see `PasteItems.ts` for why this is the path to prefer over `readText`.
 * Detaches on scope disposal, and on any change to `enabled` / `target` / `preventDefault`.
 *
 * @param handler Called on every paste with the extracted payload and the original event. A throw from it is
 *   swallowed.
 * @param options Where to listen, whether to listen, and whether to suppress the default paste.
 */
export function usePasteHandler(
  handler: (items: PasteItems, event: ClipboardEvent) => void,
  options?: UsePasteHandlerOptions,
): void {
  watchPostEffect((onCleanup) => {
    if ((toValue(options?.enabled) ?? true) === false) return;

    // Resolved lazily and guarded: importing this in an SSR pass must never touch `window`.
    const node: EventTarget | null =
      options?.target !== undefined ? (toValue(options.target) ?? null) : typeof window === 'undefined' ? null : window;
    if (node === null || typeof node.addEventListener !== 'function') return;

    // Captured at attach time so remove uses the same behaviour the listener was bound with.
    const preventDefault = toValue(options?.preventDefault) ?? false;

    const listener = (event: Event): void => {
      const pasteEvent = event as ClipboardEvent;
      if (preventDefault) {
        try {
          pasteEvent.preventDefault();
        } catch {
          // A synthetic event without a usable `preventDefault`. The handler still gets its payload.
        }
      }

      try {
        handler(getPasteItems(pasteEvent), pasteEvent);
      } catch {
        // The consumer's handler failed. Their problem — and not a reason to break the listener for the next
        // paste, which is what an escaping throw would risk.
      }
    };

    node.addEventListener('paste', listener);
    onCleanup(() => node.removeEventListener('paste', listener));
  });
}
