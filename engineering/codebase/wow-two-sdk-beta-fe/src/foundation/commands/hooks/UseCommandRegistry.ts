// The Vue subscription seam over a registry — how a component updates when commands come and go.
//
// The non-obvious part is why these track `registry.version()` instead of the command list directly: `list()` /
// `available()` build a fresh array per call, so either as the tracked value would report a change on every
// read. The monotonic version number is identity-stable between mutations, so it is what the subscription
// mirrors into a `shallowRef`; the arrays are derived from it through a `computed` that touches the version.
//
// The subscription is attached in `onMounted` and dropped in `onScopeDispose`, matching every other subscription
// in the port. Nothing here reads a platform global — a registry is plain in-memory state — so the SSR pass
// reads a correct version rather than a placeholder; the mount hook exists for the listener alone.
//
// These composables take the registry explicitly (no injection), so a scoped palette can drive its own registry.
// `CommandsContext.ts` provides the ambient-registry conveniences on top.

import { computed, onMounted, onScopeDispose, shallowRef, type ComputedRef, type ShallowRef } from 'vue';

import type { Command } from '../Command';
import type { CommandRegistry } from '../CommandRegistry';

/**
 * Subscribes to a registry's mutations and returns its current version counter. The building block behind
 * {@link useCommandList} / {@link useAvailableCommands}; use it directly to derive a custom projection
 * (`computed(() => (version.value, registry.list().filter(mine)))`).
 */
export function useCommandRegistryVersion(registry: CommandRegistry): Readonly<ShallowRef<number>> {
  const version = shallowRef(registry.version());

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    // Re-read first: a mutation between setup and mount would otherwise be missed entirely.
    version.value = registry.version();
    unsubscribe = registry.subscribe(() => {
      version.value = registry.version();
    });
  });

  onScopeDispose(() => {
    unsubscribe?.();
    unsubscribe = undefined;
  });

  return version;
}

/** Every registered command in insertion order, updating the caller whenever the registry mutates. */
export function useCommandList(registry: CommandRegistry): ComputedRef<ReadonlyArray<Command>> {
  const version = useCommandRegistryVersion(registry);
  // `version` is the mutation cursor that invalidates the list — touched, then discarded.
  return computed(() => {
    void version.value;
    return registry.list();
  });
}

/**
 * The commands a palette should show — `available()` re-evaluated on every registry mutation.
 *
 * Availability also depends on whatever `when()` reads, and a registry mutation is the only trigger here: a
 * `when` predicate closing over unrelated state won't re-run on its own. Keep predicates over state the registry
 * sees (re-register on change — `useRegisterCommands` does this for you), not over free-floating variables.
 */
export function useAvailableCommands(registry: CommandRegistry): ComputedRef<ReadonlyArray<Command>> {
  const version = useCommandRegistryVersion(registry);
  return computed(() => {
    void version.value;
    return registry.available();
  });
}
