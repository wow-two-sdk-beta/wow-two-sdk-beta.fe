// The Vue seam — an ambient registry so a screen deep in the tree can contribute commands without threading a
// registry through props, following the repo's `LocaleContext` / `DirectionContext` provide + inject shape.
//
// Non-obvious decisions:
// - `useCommands` THROWS without a provider, where `useLocale` falls back to a default. A locale has a sane
//   default (`en-US`); a registry does not — a silent fallback would accept registrations into a throwaway store
//   and the palette would just be empty, which is far harder to debug than a named error.
// - `useRegisterCommands` keys its watcher on a CONTENT signature of the commands, never on array identity. The
//   React original needed that to avoid an infinite register → notify → re-render → register loop; here it earns
//   its place for a plainer reason: a `computed` array rebuilt on an unrelated dependency would otherwise churn
//   the registry (and the palette's row order) for no change the user could see.
// - Because the watcher skips identity changes, the entries it registers delegate `run` / `when` back through
//   `toValue` to the LATEST value of the caller's source. Without that, a handler closing over reactive state
//   would be frozen at the value that last changed the signature. Text metadata is part of the signature, so it
//   re-registers when it changes; behaviour is always live. Net effect: the caller memoizes nothing.
// - The signature is built with `JSON.stringify`, not a delimiter join: JSON quoting makes each field
//   self-delimiting, so a title containing the delimiter can't forge a boundary and alias two different sets.
// - Nothing here touches a platform global, so the registration watcher is `immediate` — a server-rendered
//   palette lists the commands its subtree registered, exactly as the client does.

import {
  computed,
  inject,
  provide,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';

import { isCommandAvailable, type Command } from '../Command';
import { createCommandRegistry, type CommandErrorHandler, type CommandRegistry } from '../CommandRegistry';
import { useCommandRegistryVersion } from '../hooks/UseCommandRegistry';

/** The injection key — React's `createContext(undefined)` becomes a key plus an explicit throw at the read site. */
export const CommandsKey: InjectionKey<CommandRegistry> = Symbol('wow-two.commands');

const activeRegistries = new WeakMap<CommandRegistry, ComputedRef<CommandRegistry>>();

/**
 * The provider half — used by `CommandsProvider`, and by any component that owns a registry.
 *
 * @param registry An existing registry to share (module-scope singleton, a test's registry). Omitted → one is
 *   created and owned here.
 * @param onError Where a failing command's error goes. Read live, and ignored when `registry` is supplied —
 *   that registry carries its own handler.
 * @returns The registry that was provided.
 */
export function provideCommands(
  registry?: MaybeRefOrGetter<CommandRegistry | undefined>,
  onError?: MaybeRefOrGetter<CommandErrorHandler | undefined>,
): CommandRegistry {
  // Read live so a fresh `onError` closure is picked up without rebuilding the registry.
  const owned = createCommandRegistry({
    onError: (error, command) => toValue(onError)?.(error, command),
  });
  const active = computed(() => toValue(registry) ?? owned);
  const revision = shallowRef(0);
  const listeners = new Set<() => void>();
  const notify = (): void => {
    revision.value += 1;
    for (const listener of [...listeners]) listener();
  };
  watch(
    active,
    (current, _previous, cleanup) => {
      cleanup(current.subscribe(notify));
      notify();
    },
    { immediate: true, flush: 'sync' },
  );
  const facade: CommandRegistry = {
    register: (command) => active.value.register(command),
    registerAll: (commands) => active.value.registerAll(commands),
    unregister: (id) => active.value.unregister(id),
    get: (id) => active.value.get(id),
    list: () => active.value.list(),
    available: () => active.value.available(),
    run: (id, context) => active.value.run(id, context),
    version: () => revision.value,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  activeRegistries.set(facade, active);
  provide(CommandsKey, facade);
  return facade;
}

/** Reads the ambient registry. Throws when no {@link CommandsKey} provider is mounted — see the file header. */
export function useCommands(): CommandRegistry {
  const registry = inject(CommandsKey, undefined);
  if (registry === undefined) {
    throw new Error('useCommands must be used inside a <CommandsProvider>');
  }
  return registry;
}

/**
 * Reads one command from the ambient registry by id, updating when that command is registered, replaced, or
 * removed. `undefined` while nothing owns the id — a palette row can render a disabled placeholder from it.
 */
export function useCommand(id: MaybeRefOrGetter<string>): ComputedRef<Command | undefined> {
  const registry = useCommands();
  const version = useCommandRegistryVersion(registry);
  // `get` returns the stored object, whose identity is stable between mutations; `version` is the cursor that
  // says when to look again.
  return computed(() => {
    void version.value;
    return registry.get(toValue(id));
  });
}

/**
 * Builds the content key that decides when a registration is stale — every searchable / rendered text field plus
 * `enabled`. `run`, `when`, and `icon` are excluded (functions and opaque slots don't serialize); they stay fresh
 * through {@link bindToLatest} instead.
 */
function metadataSignature(command: Command): string {
  return JSON.stringify([
    command.id,
    command.title,
    command.description ?? '',
    command.group ?? '',
    command.keywords ?? [],
    command.shortcut ?? '',
    command.enabled !== false,
  ]);
}

/**
 * Wraps a command so `run` / `when` resolve against the latest value of the caller's source rather than the
 * snapshot captured when the watcher last ran. Metadata comes from the snapshot — it is covered by the
 * signature, so it can't drift.
 */
function bindToLatest(command: Command, latest: MaybeRefOrGetter<ReadonlyArray<Command>>): Command {
  const id = command.id;
  const resolve = (): Command | undefined => toValue(latest).find((candidate) => candidate.id === id);
  return {
    ...command,
    get icon() {
      return resolve()?.icon;
    },
    when: () => {
      const current = resolve();
      // Gone from the caller's array but not yet unregistered (mid-cleanup) → treat as unavailable.
      return current !== undefined && isCommandAvailable(current);
    },
    run: (context) => resolve()?.run(context),
  };
}

/**
 * Registers commands for as long as the calling scope lives, unregistering when it is disposed. The array may be
 * an inline literal, a ref, or a getter — registration re-runs when the commands' text metadata changes, and
 * `run` / `when` always call through to the latest value.
 *
 * Pass `registry` to target a specific registry; otherwise the ambient one is used (and a missing provider throws).
 */
export function useRegisterCommands(
  commands: MaybeRefOrGetter<ReadonlyArray<Command>>,
  registry?: CommandRegistry,
): void {
  const target = registry ?? inject(CommandsKey, undefined);
  if (target === undefined) {
    throw new Error('useRegisterCommands must be used inside a <CommandsProvider>, or given an explicit registry');
  }

  // The content-stable key standing in for the array — see the file header on why identity fails.
  const signature = computed(() => toValue(commands).map(metadataSignature).join(''));

  watch(
    [signature, () => activeRegistries.get(target)?.value ?? target],
    (_next, _previous, onCleanup) => {
      const dispose = target.registerAll(toValue(commands).map((command) => bindToLatest(command, commands)));
      onCleanup(dispose);
    },
    { immediate: true },
  );
}
