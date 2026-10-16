// shortcuts — foundation seam. A keyboard-shortcut system: the pure `Chord` model (`parseChord`/`matchesChord`/
// `formatChord`, platform-adaptive `mod` = ⌘ on Apple / Ctrl elsewhere, `Modifier` + re-exported `Key` constants)
// plus the `useHotkeys` / `useHotkeyMap` binding hooks (scoped to `window` or an element, typing-context aware).
// Replaces the hand-rolled `cmd+K` / `Enter` listeners scattered across components (CommandPalette, ChatComposer).

export {
  type Chord,
  type KeyboardEventLike,
  type ChordPlatformOptions,
  Modifier,
  isApplePlatform,
  parseChord,
  matchesChord,
  formatChord,
  formatChordString,
} from './Chord';

// Re-exported so `foundation/shortcuts` is the single entry for keyboard constants (the map itself lives in
// `foundation/dom/keyboardExtensions`).
export { Key } from '../dom/enums/Key';

export { useHotkeys, useHotkeyMap, type HotkeyOptions } from './hooks/UseHotkeys';

export * from './hooks/UseEscape';
