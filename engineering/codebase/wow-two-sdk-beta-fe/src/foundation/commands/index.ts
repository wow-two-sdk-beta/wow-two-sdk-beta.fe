// commands — foundation seam. The "commands" half of a command-palette system, headless: a `Command` contract
// (id · title · keywords · group · chord · `when` predicate · sync-or-async `run`), a framework-free
// `createCommandRegistry()` store, pure ranked `searchCommands()`, and the Vue seam that binds them —
// `CommandsProvider` / `useCommands` / `useRegisterCommands`, plus `useCommandShortcuts` wiring every command's
// chord through `foundation/shortcuts`' `useHotkeyMap`.
//
// The split matters: the registry answers "what can run", this slice never renders anything. A palette
// (`presentation/nav/commandPalette`) is a CONSUMER — it reads `available()`, filters with `searchCommands`, and
// labels rows with `commandShortcutLabel`, so the same command set can also feed a menu, a mobile action sheet,
// or a keybinding-only surface with no palette mounted at all.
//
// Chord parsing is never duplicated here — every chord string flows through `foundation/shortcuts`, so what a row
// displays and what the keyboard triggers can't drift apart.

// Contract — the vocabulary every other file in the slice speaks
export { isCommandAvailable, type Command, type CommandContext } from './Command';

// Registry — the headless store
export {
  createCommandRegistry,
  type CommandErrorHandler,
  type CommandRegistry,
  type CommandRegistryListener,
  type CommandRegistryOptions,
} from './CommandRegistry';

// Search — pure, ranked filtering for a palette's input
export { CommandMatchRank, NoMatch, rankCommand, searchCommands } from './SearchCommands';

// Display — the `⌘K` / `Ctrl+K` label for a command's chord
export { commandShortcutLabel } from './CommandShortcut';

// Vue — registry subscription primitives (explicit registry)
export { useAvailableCommands, useCommandList, useCommandRegistryVersion } from './hooks/UseCommandRegistry';

// Vue — shortcut binding
export { useCommandShortcuts, type CommandShortcutOptions } from './hooks/UseCommandShortcuts';

// Vue — ambient registry seam. `CommandsProvider` is an SFC, so it needs its own named re-export; the
// provide/inject half lives in `CommandsContext.ts` as `provideCommands`, for a component that owns a registry
// and wants no wrapper element.
export {
  CommandsKey,
  provideCommands,
  useCommand,
  useCommands,
  useRegisterCommands,
} from './providers/CommandsContext';

export { default as CommandsProvider, type CommandsProviderProps } from './providers/CommandsProvider.vue';

export { CommandRunFailureCode } from './CommandRunFailureCode';
export type { CommandRunFailure } from './models/CommandRunFailure';
export type { CommandRunResult } from './models/CommandRunResult';
