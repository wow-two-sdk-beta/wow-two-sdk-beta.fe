import { computed, inject, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import { routerKey, type Router } from 'vue-router';

/*
 * react-router exposes a first-class `useNavigation().state`; vue-router exposes none — a pending
 * navigation is observable only through the global hooks. One busy flag per router instance, kept in
 * a WeakMap so N indicators share one set of hooks and a discarded router is collectable.
 *
 * A FLAG, not a counter: a guard redirect re-enters `beforeEach` without a matching `afterEach`, so
 * a counter would drift upward and pin the indicator on forever. `afterEach` fires for every settled
 * navigation (including aborted / cancelled ones) and `onError` for thrown ones, so the flag always
 * clears.
 */
const registry = new WeakMap<Router, ShallowRef<boolean>>();

/**
 * @internal Installs (once per router) the hooks backing `useRouteNavigating`, and returns the flag.
 * `createAppRouter` calls this eagerly so the very first navigation is already covered.
 */
export function installRouteNavigating(router: Router): ShallowRef<boolean> {
  const existing = registry.get(router);
  if (existing) return existing;

  const busy = shallowRef(false);
  registry.set(router, busy);

  router.beforeEach(() => {
    busy.value = true;
  });
  router.afterEach(() => {
    busy.value = false;
  });
  router.onError(() => {
    busy.value = false;
  });

  return busy;
}

/**
 * Reports whether a route navigation is in flight — the vue-router counterpart of react-router's
 * `useNavigation().state !== 'idle'`, covering lazy-chunk loads and async guards.
 *
 * Resolves the router by injection when none is passed, and reads `false` forever when there is no
 * router at all, so `<NavigationProgress mode="manual">` works in a router-less tree.
 */
export function useRouteNavigating(router?: Router): ComputedRef<boolean> {
  const resolved = router ?? inject(routerKey, null);
  if (!resolved) return computed(() => false);
  const busy = installRouteNavigating(resolved);
  return computed(() => busy.value);
}
