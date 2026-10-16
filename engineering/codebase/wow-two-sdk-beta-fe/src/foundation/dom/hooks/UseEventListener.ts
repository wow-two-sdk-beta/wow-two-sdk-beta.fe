import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

type Target = Window | Document | HTMLElement | null | undefined;

/**
 * Add an event listener and clean it up automatically. Every argument may be a
 * ref or a getter, so a `useTemplateRef` target attaches the moment the element
 * mounts and re-attaches if it is swapped — the Vue stand-in for the original's
 * handler-in-a-ref indirection.
 *
 * `handler` is captured at setup (it is a plain function, never a getter — a
 * getter is indistinguishable from the handler itself). Pass a wrapper when the
 * callee must stay live: `useEventListener('click', (e) => props.onClick?.(e))`.
 *
 * The default target is resolved lazily so importing this in an SSR pass never
 * touches `document`.
 */
export function useEventListener<K extends string>(
  event: MaybeRefOrGetter<K>,
  handler: (event: Event) => void,
  target: MaybeRefOrGetter<Target> = () => (typeof document === 'undefined' ? null : document),
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions | undefined>,
): void {
  watchPostEffect((onCleanup) => {
    const element = toValue(target);
    if (!element) return;
    // Capture options at attach time — remove must use the same capture flag.
    const listenerOptions = toValue(options);
    const capture = typeof listenerOptions === 'boolean' ? listenerOptions : (listenerOptions?.capture ?? false);
    const type = toValue(event);
    const listener = (e: Event): void => handler(e);
    element.addEventListener(type, listener, listenerOptions);
    onCleanup(() => element.removeEventListener(type, listener, capture));
  });
}
