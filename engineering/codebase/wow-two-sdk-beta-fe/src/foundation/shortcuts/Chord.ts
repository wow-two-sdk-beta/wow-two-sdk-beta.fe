// The chord model — the pure, DOM-free core of the shortcuts vector. A "chord" is one keystroke combination
// (`mod+shift+k`): a main key plus modifier flags. Parsing accepts a terse cross-platform string where `mod`
// resolves to ⌘ on Apple and Ctrl elsewhere, so a consumer writes a shortcut once and it feels native on both.
// Matching compares a `KeyboardEvent` against a parsed chord; formatting renders it for a `<kbd>` hint. No Vue,
// no listeners — `UseHotkeys.ts` binds these to the DOM.

import { Key } from '../dom/enums/Key';

/** The modifier tokens a chord string accepts. `Mod` is platform-adaptive (⌘ on Apple, Ctrl elsewhere). */
export const Modifier = {
  /** Platform-adaptive primary modifier — ⌘ (Command) on Apple, Ctrl elsewhere. */
  Mod: 'mod',
  /** The Control key. */
  Ctrl: 'ctrl',
  /** The Meta key — ⌘ (Command) on Apple, ⊞ (Windows) elsewhere. */
  Meta: 'meta',
  /** The Shift key. */
  Shift: 'shift',
  /** The Alt / Option key. */
  Alt: 'alt',
} as const;

export type Modifier = (typeof Modifier)[keyof typeof Modifier];

/** A parsed keystroke combination — a canonical main key plus the four modifier flags. */
export interface Chord {
  /** The canonical `KeyboardEvent.key` for the main key (letters lowercased, named keys canonical, e.g. `Enter`). */
  readonly key: string;
  /** Whether Control must be held. */
  readonly ctrl: boolean;
  /** Whether Meta (⌘ / ⊞) must be held. */
  readonly meta: boolean;
  /** Whether Shift must be held. */
  readonly shift: boolean;
  /** Whether Alt / Option must be held. */
  readonly alt: boolean;
}

/** The `KeyboardEvent` fields a chord match reads — a structural subset satisfied by native DOM events. */
export type KeyboardEventLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/** Named-key aliases (case-insensitive) → canonical `KeyboardEvent.key` — `esc`/`up`/`del` for the verbose form. */
const KeyAliases: Readonly<Record<string, string>> = {
  esc: Key.Escape,
  escape: Key.Escape,
  enter: Key.Enter,
  return: Key.Enter,
  space: Key.Space,
  spacebar: Key.Space,
  tab: Key.Tab,
  backspace: Key.Backspace,
  delete: Key.Delete,
  del: Key.Delete,
  up: Key.ArrowUp,
  down: Key.ArrowDown,
  left: Key.ArrowLeft,
  right: Key.ArrowRight,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  pagedown: Key.PageDown,
  // `+` is the token separator, so spell the literal plus key as `plus`.
  plus: '+',
};

/** Detects an Apple platform (for `mod` → ⌘ and symbol formatting). SSR-safe; `platformHint` forces it in tests. */
export function isApplePlatform(platformHint?: string): boolean {
  if (platformHint !== undefined) return /mac|iphone|ipad|ipod/i.test(platformHint);
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const source = nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(source);
}

/** Options shared by the platform-sensitive chord helpers. */
export interface ChordPlatformOptions {
  /** Forces Apple vs non-Apple resolution (for `mod` and formatting); defaults to runtime detection. */
  readonly applePlatform?: boolean;
}

/** Normalizes one non-modifier token to a canonical `KeyboardEvent.key`. */
function normalizeKey(token: string): string {
  const alias = KeyAliases[token];
  if (alias !== undefined) return alias;
  // Function keys: `f1`..`f12` → `F1`..`F12`.
  if (/^f\d{1,2}$/.test(token)) return token.toUpperCase();
  // Single character (letter / digit / symbol) is already its own `key` (letters compared case-insensitively).
  return token;
}

/**
 * Parses a chord string (`mod+shift+k`, `ctrl+/`, `esc`) into a {@link Chord}. Tokens split on `+`, are
 * case-insensitive, and may appear in any order; `mod` resolves per platform. Throws when no non-modifier key
 * is present. To bind the literal `+` key, write `plus` (or `mod+plus`).
 */
export function parseChord(input: string, options?: ChordPlatformOptions): Chord {
  const apple = options?.applePlatform ?? isApplePlatform();
  const tokens = input
    .split('+')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);

  let ctrl = false;
  let meta = false;
  let shift = false;
  let alt = false;
  let key = '';

  for (const token of tokens) {
    switch (token) {
      case 'mod':
        if (apple) meta = true;
        else ctrl = true;
        break;
      case 'cmd':
      case 'command':
      case 'meta':
      case 'super':
      case 'win':
      case 'windows':
      case '⌘':
        meta = true;
        break;
      case 'ctrl':
      case 'control':
      case '^':
        ctrl = true;
        break;
      case 'shift':
      case '⇧':
        shift = true;
        break;
      case 'alt':
      case 'option':
      case 'opt':
      case '⌥':
        alt = true;
        break;
      default:
        key = normalizeKey(token);
    }
  }

  if (key === '') throw new Error(`Invalid chord "${input}": no non-modifier key`);
  return { key, ctrl, meta, shift, alt };
}

/** Tests whether a keyboard event satisfies a chord — all four modifiers exact, main key case-insensitive. */
export function matchesChord(event: KeyboardEventLike, chord: Chord): boolean {
  return (
    event.ctrlKey === chord.ctrl &&
    event.metaKey === chord.meta &&
    event.shiftKey === chord.shift &&
    event.altKey === chord.alt &&
    event.key.toLowerCase() === chord.key.toLowerCase()
  );
}

/** Arrow/space display glyphs used when rendering a chord. */
const DisplayKeys: Readonly<Record<string, string>> = {
  [Key.ArrowUp]: '↑',
  [Key.ArrowDown]: '↓',
  [Key.ArrowLeft]: '←',
  [Key.ArrowRight]: '→',
  [Key.Space]: 'Space',
  [Key.Enter]: '↵',
};

/** Renders a chord's main key for display — glyph for arrows/space/enter, uppercased single letters, else as-is. */
function displayKey(key: string): string {
  const glyph = DisplayKeys[key];
  if (glyph !== undefined) return glyph;
  return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * Renders a chord as a human label for a `<kbd>` hint. Apple builds the compact symbol form (`⌃⌥⇧⌘K`); other
 * platforms build the `Ctrl+Alt+Shift+Win+K` form. Modifier order follows each platform's convention.
 */
export function formatChord(chord: Chord, options?: ChordPlatformOptions): string {
  const apple = options?.applePlatform ?? isApplePlatform();

  if (apple) {
    let out = '';
    if (chord.ctrl) out += '⌃';
    if (chord.alt) out += '⌥';
    if (chord.shift) out += '⇧';
    if (chord.meta) out += '⌘';
    return out + displayKey(chord.key);
  }

  const parts: string[] = [];
  if (chord.ctrl) parts.push('Ctrl');
  if (chord.alt) parts.push('Alt');
  if (chord.shift) parts.push('Shift');
  if (chord.meta) parts.push('Win');
  parts.push(displayKey(chord.key));
  return parts.join('+');
}

/** Convenience: parse then format a chord string in one step (`formatChordString('mod+k')` → `⌘K` / `Ctrl+K`). */
export function formatChordString(input: string, options?: ChordPlatformOptions): string {
  return formatChord(parseChord(input, options), options);
}
