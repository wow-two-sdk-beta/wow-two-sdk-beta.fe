// Binds every available command that carries a `shortcut` to its chord, in one composable. This is the join
// between the commands vector and `foundation/shortcuts`: the registry owns "what can run", `useHotkeyMap` owns
// "what the keyboard did", and this composable keeps the two in sync as commands register and unregister.
//
// Non-obvious decisions:
// - The map is a GETTER over `registry.available()` that touches the version cursor, so it is rebuilt on every
//   registry mutation and a command whose `when()` starts failing loses its binding instead of firing invisibly.
//   `useHotkeyMap` accepts a `MaybeRefOrGetter` map for exactly this shape.
// - Two commands claiming the same chord collapse to one entry — last registered wins, matching the registry's
//   own last-wins rule for duplicate ids. Object keys can't hold both, and silently binding only one is better
//   than throwing while building the map.
// - `context` and `onRun` are read through `toValue` at trigger time, so changing either needs no re-binding.
// - Chord parsing is NOT duplicated here — the raw `shortcut` string is handed to `useHotkeyMap`, which parses it
//   with the same `applePlatform` option `commandShortcutLabel` uses for display.

import { toValue, type MaybeRefOrGetter } from 'vue';

import { useHotkeyMap, type HotkeyOptions } from '../../shortcuts';

import type { CommandContext } from '../Command';
import type { CommandRegistry } from '../CommandRegistry';
import { useCommandRegistryVersion } from './UseCommandRegistry';

/** Tunes command-shortcut binding — every `useHotkeyMap` option, plus the payload passed to the command. */
export interface CommandShortcutOptions extends HotkeyOptions {
  /** Forwarded to `registry.run(id, context)` on every trigger. Read live, so changing it needs no re-binding. */
  readonly context?: MaybeRefOrGetter<CommandContext>;

  /** Notified after a triggered command settles — the seam for closing a palette or logging the outcome. */
  readonly onRun?: (id: string) => void;
}

/**
 * Binds the chord of every available command in `registry`, running the command on trigger. Re-binds whenever the
 * registry changes. Commands without a `shortcut`, and commands `when()`/`enabled` currently blocks, bind nothing.
 *
 * Expected failures settle normally; programmer exceptions are reported by the registry and remain rejected.
 */
export function useCommandShortcuts(registry: CommandRegistry, options?: CommandShortcutOptions): void {
  const version = useCommandRegistryVersion(registry);

  const trigger = (id: string): void => {
    void registry.run(id, toValue(options?.context)).then(() => options?.onRun?.(id));
  };

  useHotkeyMap(() => {
    // `version` is the mutation cursor that invalidates the map — touched, then discarded.
    void version.value;
    const bindings: Record<string, (event: KeyboardEvent) => void> = {};
    for (const command of registry.available()) {
      const shortcut = command.shortcut;
      if (shortcut === undefined) continue;
      const id = command.id;
      bindings[shortcut] = () => trigger(id);
    }
    return bindings;
  }, options);
}
