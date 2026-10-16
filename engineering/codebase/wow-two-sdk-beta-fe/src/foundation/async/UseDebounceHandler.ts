import { toValue, type MaybeRefOrGetter } from 'vue';

/**
 * Throttle a DOM event handler. First call in a `ms` window fires; subsequent
 * within the window are swallowed via `event.preventDefault()`. When `ms` is
 * `undefined`, the handler passes through unchanged. Use to prevent rapid-fire
 * gestures (double-clicks, double-submits, repeated touches) without wiring
 * timer state in the consumer.
 *
 * Functionally a *throttle* (first wins). The `Debounce` naming is kept for
 * vocabulary consistency with the `debounceMs` props on consuming components.
 *
 * `ms` may be a ref or getter and is read per event. `handler` is captured at
 * setup (a function argument cannot double as a getter) — wrap it when the
 * callee must stay live: `useDebounceHandler((e) => props.onClick?.(e), ms)`.
 */
export function useDebounceHandler<E extends Event = Event>(
  handler: ((event: E) => void) | undefined,
  ms: MaybeRefOrGetter<number | undefined>,
): (event: E) => void {
  let lastTime = 0;
  return (event: E): void => {
    const interval = toValue(ms);
    if (interval !== undefined) {
      const now = Date.now();
      if (now - lastTime < interval) {
        event.preventDefault();
        return;
      }
      lastTime = now;
    }
    handler?.(event);
  };
}
