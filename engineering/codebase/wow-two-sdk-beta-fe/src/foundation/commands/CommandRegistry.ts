// The registry — the headless core of the commands vector: a mutable, insertion-ordered `id → Command` store that
// a palette, menu, or keybinding layer reads from. Framework-free on purpose (no Vue import) so one can be
// created at module scope, inside a provider, or in a plain node test.
//
// Non-obvious decisions:
// - Re-registering an existing `id` REPLACES the entry (last wins) and keeps its ORIGINAL position in `list()`.
//   A `Map.set` on an existing key doesn't move it, which is what we want: a re-registration refreshing a command
//   must not make the palette's rows jump around.
// - A `register` disposer removes only the entry it registered. A stale disposer firing after a replace is a
//   no-op — exactly what an effect cleanup racing a re-registration needs (cleanup runs after the next register).
// - Expected missing/blocked/handler failures resolve to CommandRunResult. Programmer exceptions from
//   predicates or handlers are reported to onError, then reject instead of masquerading as recoverable failures.
// - Mutations bump a monotonic `version()` on top of notifying listeners. A subscribing composable needs a
//   snapshot whose identity is stable between mutations; `list()` / `available()` build fresh arrays every call
//   and would look changed on every read. The version number is the stable cursor those composables read instead.
// - `registerAll` applies every entry then notifies ONCE, so registering a screen's ten commands wakes
//   subscribers a single time.

import { ResultExtensions } from '../results';
import { CommandRunFailureCode } from './CommandRunFailureCode';
import type { CommandRunResult } from './models/CommandRunResult';

import { isCommandAvailable, type Command, type CommandContext } from './Command';

/** Receives an error thrown or rejected by a command's `run` (or its `when` predicate), with the offending command. */
export type CommandErrorHandler = (error: unknown, command: Command) => void;

/** Notified after any registry mutation — register, replace, or unregister. No payload; re-read the registry. */
export type CommandRegistryListener = () => void;

/** Tunes a registry at creation. */
export interface CommandRegistryOptions {
  /** Reports a programmer exception before the run promise rejects with it. */
  readonly onError?: CommandErrorHandler;
}

/** The headless command store — registration, lookup, availability, execution, and change notification. */
export interface CommandRegistry {
  /** Registers (or replaces, when the `id` exists) a command; returns a disposer removing exactly this entry. */
  readonly register: (command: Command) => () => void;

  /** Registers many commands with a single change notification; returns one disposer removing all of them. */
  readonly registerAll: (commands: ReadonlyArray<Command>) => () => void;

  /** Removes the command under `id`; returns whether anything was removed. */
  readonly unregister: (id: string) => boolean;

  /** Looks up a command by id — `undefined` when absent. Identity is stable between mutations (safe to snapshot). */
  readonly get: (id: string) => Command | undefined;

  /** Every registered command in insertion order (a replaced entry keeps its original slot). Fresh array per call. */
  readonly list: () => readonly Command[];

  /** The subset of `list()` that `isCommandAvailable` accepts — what a palette should show. Fresh array per call. */
  readonly available: () => readonly Command[];

  /** Executes a command by id. Expected failures return Result; programmer errors reject after reporting. */
  readonly run: (id: string, context?: CommandContext) => Promise<CommandRunResult>;

  /** Subscribes to mutations; returns an unsubscribe. */
  readonly subscribe: (listener: CommandRegistryListener) => () => void;

  /** A monotonic counter bumped on every mutation — the stable-identity snapshot the composables subscribe to. */
  readonly version: () => number;
}

/**
 * Creates a {@link CommandRegistry}. One per app is the norm (a `CommandsProvider` owns it); create extra ones for
 * isolation in tests or for a scoped palette that must not see the global set.
 */
export function createCommandRegistry(options?: CommandRegistryOptions): CommandRegistry {
  const entries = new Map<string, Command>();
  const registrations = new Map<string, symbol>();
  const listeners = new Set<CommandRegistryListener>();
  let revision = 0;

  /** Bumps the version then fans out to listeners over a copy, so a listener may unsubscribe while being notified. */
  function notify(): void {
    revision += 1;
    for (const listener of [...listeners]) listener();
  }

  /** Removes `command` only if it is still the entry under its id; reports whether it removed anything. */
  function removeExact(id: string, token: symbol): boolean {
    if (registrations.get(id) !== token) return false;
    entries.delete(id);
    registrations.delete(id);
    return true;
  }

  return {
    register(command: Command): () => void {
      const id = command.id;
      const token = Symbol(id);
      entries.set(id, command);
      registrations.set(id, token);
      notify();
      return () => {
        if (removeExact(id, token)) notify();
      };
    },

    registerAll(commands: ReadonlyArray<Command>): () => void {
      const registered = commands.map((command) => {
        const id = command.id;
        const token = Symbol(id);
        entries.set(id, command);
        registrations.set(id, token);
        return { id, token };
      });
      notify();
      return () => {
        let removed = false;
        for (const { id, token } of registered) removed = removeExact(id, token) || removed;
        if (removed) notify();
      };
    },

    unregister(id: string): boolean {
      if (!entries.delete(id)) return false;
      registrations.delete(id);
      notify();
      return true;
    },

    get(id: string): Command | undefined {
      return entries.get(id);
    },

    list(): ReadonlyArray<Command> {
      return [...entries.values()];
    },

    available(): ReadonlyArray<Command> {
      return [...entries.values()].filter(isCommandAvailable);
    },

    async run(id: string, context?: CommandContext): Promise<CommandRunResult> {
      const command = entries.get(id);
      if (command === undefined) return ResultExtensions.fail({ code: CommandRunFailureCode.NotFound });
      try {
        // A predicate bug is reported with the same command context as a handler bug.
        if (!isCommandAvailable(command)) return ResultExtensions.fail({ code: CommandRunFailureCode.Unavailable });
        const result = await command.run(context);
        return result === undefined || result.ok
          ? ResultExtensions.ok(undefined)
          : ResultExtensions.fail({ code: CommandRunFailureCode.Failed, error: result.failure });
      } catch (error) {
        options?.onError?.(error, command);
        throw error;
      }
    },

    subscribe(listener: CommandRegistryListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    version(): number {
      return revision;
    },
  };
}
