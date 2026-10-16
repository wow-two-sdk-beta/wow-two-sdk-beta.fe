import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import { subscribeToPermissionChange, type PermissionQueryName, type PermissionQueryState } from '../QueryPermission';

/**
 * Follows a permission's state reactively, updating when the user grants or revokes it — including from
 * the browser's own site settings or another tab.
 *
 * Holds `null` while the first query is in flight (and during SSR), then a {@link PermissionQueryState}.
 * Changing `name` resets to `null` and re-queries. Never throws.
 *
 * @param name The permission to follow — `'notifications'`, `'geolocation'`, `'camera'`, … A ref or getter
 *   re-queries when it changes.
 * @returns The current state, or `null` before the first answer.
 */
export function usePermissionState(
  name: MaybeRefOrGetter<PermissionQueryName>,
): Readonly<ShallowRef<PermissionQueryState | null>> {
  const state = shallowRef<PermissionQueryState | null>(null);

  let unsubscribe: (() => void) | undefined;

  function stop(): void {
    unsubscribe?.();
    unsubscribe = undefined;
  }

  function start(): void {
    stop();
    // A new `name` invalidates the previous answer immediately — showing the old permission's state under the
    // new name's label would be simply wrong, where `null` is merely uninformative.
    state.value = null;
    unsubscribe = subscribeToPermissionChange(toValue(name), (next) => {
      state.value = next;
    });
  }

  onMounted(start);
  // Non-immediate on purpose: an immediate watcher runs on the server, where `navigator` is absent.
  watch(() => toValue(name), start);
  onScopeDispose(stop);

  return state;
}
