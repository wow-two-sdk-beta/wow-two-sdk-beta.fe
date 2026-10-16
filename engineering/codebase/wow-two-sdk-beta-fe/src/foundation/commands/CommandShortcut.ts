// The display half of a command's shortcut. A palette row shows `⌘K` / `Ctrl+K` next to the title; without this
// helper every surface would re-derive that label from the raw `'mod+k'` string and eventually drift from what
// `useCommandShortcuts` actually binds. Delegating to `foundation/shortcuts`' `formatChordString` keeps the label
// and the binding on one parser, including the platform split (`mod` → ⌘ on Apple, Ctrl elsewhere).
//
// An unparseable chord degrades to the raw string instead of throwing: a typo'd shortcut should render oddly, not
// crash the palette rendering it. The error still surfaces loudly the moment the chord is bound.

import { formatChordString, type ChordPlatformOptions } from '../shortcuts';

import type { Command } from './Command';

/**
 * Renders a command's shortcut for display (`'mod+k'` → `⌘K` on Apple, `Ctrl+K` elsewhere). Returns `undefined`
 * when the command carries no shortcut, and the raw string when it carries one the chord parser rejects.
 * Pass `{ applePlatform }` to force the platform (SSR, tests, a per-user preference).
 */
export function commandShortcutLabel(command: Command, options?: ChordPlatformOptions): string | undefined {
  const shortcut = command.shortcut;
  if (shortcut === undefined) return undefined;
  try {
    return formatChordString(shortcut, options);
  } catch {
    return shortcut;
  }
}
