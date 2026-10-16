import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import { subscribeMediaQuery } from './UseMediaQuery';
import { resolveBreakpoint, toBreakpointQueries, type BreakpointScale } from '../Breakpoints';

/** Tracks every valid breakpoint in the caller's scale and releases replaced subscriptions. */
export function useBreakpoint<TScale extends BreakpointScale>(
  scale: MaybeRefOrGetter<TScale>,
): ComputedRef<Extract<keyof TScale, string> | null> {
  const queries = computed(() => toBreakpointQueries(toValue(scale)));
  const active = shallowRef<Extract<keyof TScale, string> | null>(null);
  let mounted = false;
  let dispose: (() => void) | undefined;
  function subscribe(): void {
    dispose?.();
    dispose = undefined;
    if (!mounted) return;
    const current = queries.value;
    const matches: boolean[] = current.map(() => false);
    active.value = null;
    const disposers = current.map((entry, index) =>
      subscribeMediaQuery(entry.query, (value) => {
        matches[index] = value;
        active.value = resolveBreakpoint(current, matches);
      }),
    );
    dispose = () => {
      for (const unsubscribe of disposers) unsubscribe();
    };
  }
  onMounted(() => {
    mounted = true;
    subscribe();
  });
  watch(queries, subscribe);
  onScopeDispose(() => {
    mounted = false;
    dispose?.();
  });
  return computed(() => active.value);
}
