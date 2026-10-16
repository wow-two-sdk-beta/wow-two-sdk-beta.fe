import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';

/**
 * Reactively follow a CSS media query. Pass a query string like
 * `'(min-width: 768px)'` or `'(prefers-reduced-motion: reduce)'`, or a ref /
 * getter when the query itself changes.
 *
 * SSR-safe — the ref holds `false` on the server and during the first render,
 * then syncs to the real value once mounted. The subscription is the Vue
 * counterpart of the original's `useSyncExternalStore`: subscribe on mount,
 * unsubscribe when the scope is disposed.
 */
/** Subscribes to one media query and reports its initial browser value. */
export function subscribeMediaQuery(query: string, onChange: (matches: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const list = window.matchMedia(query);
  const listener = (event: MediaQueryListEvent): void => onChange(event.matches);
  list.addEventListener('change', listener);
  onChange(list.matches);
  return () => list.removeEventListener('change', listener);
}

export function useMediaQuery(query: MaybeRefOrGetter<string>): Readonly<ShallowRef<boolean>> {
  const matches = shallowRef(false);

  let dispose: (() => void) | undefined;
  function unsubscribe(): void {
    dispose?.();
    dispose = undefined;
  }
  function subscribe(): void {
    unsubscribe();
    dispose = subscribeMediaQuery(toValue(query), (value) => {
      matches.value = value;
    });
  }
  onMounted(subscribe);
  // A changed query is a new subscription; `subscribe` drops the old listener first.
  watch(() => toValue(query), subscribe);
  onScopeDispose(unsubscribe);

  return matches;
}
