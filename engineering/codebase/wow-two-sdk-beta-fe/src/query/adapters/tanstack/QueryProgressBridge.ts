import { defineComponent, onScopeDispose, watch } from 'vue';
import { useIsFetching, useIsMutating } from '@tanstack/vue-query';

// Deep import (not the `../router` barrel): the barrel statically imports vue-router, and a barrel
// import here would merge the whole router graph into the shared chunk `/query` loads — breaking
// `/query`'s isolation from the OPTIONAL vue-router peer. `UseNavigationProgress` is plain Vue.
import { useNavigationProgress } from '../../../router/hooks/UseNavigationProgress';

/**
 * Lights the router's manual heartbeat while the query layer has any fetch or mutation in flight.
 *
 * Call inside BOTH a query client scope (`queryPlugin` / `<QueryProvider>`) and a `<ProgressProvider>`
 * — `useNavigationProgress` THROWS outside one. Wires effects only; it drives
 * `<NavigationProgress variant="heartbeat" mode="manual" />`.
 */
export function useQueryProgressBridge(): void {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const { begin } = useNavigationProgress();

  let end: (() => void) | null = null;

  // Open a manual busy span on 0→>0, close it on >0→0. `flush: 'sync'` is deliberately NOT used —
  // the default pre-flush is enough, and the callback touches no browser global, so it is SSR-safe
  // even though `immediate` runs it on the server.
  watch(
    () => fetching.value + mutating.value,
    (activity) => {
      if (activity > 0 && end === null) end = begin();
      else if (activity === 0 && end !== null) {
        end();
        end = null;
      }
    },
    { immediate: true },
  );

  // Close any still-open span when the bridge's scope is disposed mid-request.
  onScopeDispose(() => {
    end?.();
    end = null;
  });
}

/**
 * Renders nothing; wires `useQueryProgressBridge`.
 *
 * The component form React shipped, kept so an app can drop `<QueryProgressBridge />` into its
 * shell unchanged. Authored as a `defineComponent` rather than an SFC — it has no template.
 */
export const QueryProgressBridge = defineComponent({
  name: 'QueryProgressBridge',
  setup() {
    useQueryProgressBridge();
    return () => null;
  },
});
