// The DOM binding layer of the shortcuts vector. `useHotkeys` attaches a keydown/keyup listener (to `window` or
// a scoped element) that matches a chord and fires a handler; `useHotkeyMap` binds many chords at once — the
// shape a command palette or an editor wants. Every option may be a ref or a getter, so a consumer never has to
// re-invoke anything to change one, and both skip typing contexts by default (a bare `k` shouldn't fire while the
// user types in an input), while still letting ⌘/Ctrl combos through so `mod+k` works even with a field focused.

import { computed, toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

import { matchesChord, parseChord, type Chord, type ChordPlatformOptions } from '../Chord';

/** Tunes how a hotkey binding listens. */
export interface HotkeyOptions extends ChordPlatformOptions {
  /** Whether the binding is active. Defaults to `true`. */
  readonly enabled?: MaybeRefOrGetter<boolean>;

  /** Whether a match calls `event.preventDefault()`. Defaults to `true`. */
  readonly preventDefault?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to ignore keystrokes while a text input / textarea / select / `contenteditable` has focus.
   * Defaults to `true` — but a chord carrying Ctrl or Meta still fires (so `mod+k` works inside a field).
   */
  readonly ignoreInputs?: MaybeRefOrGetter<boolean>;

  /** The element to bind to; defaults to `window`. Pass a template ref to scope the shortcut to a subtree. */
  readonly target?: MaybeRefOrGetter<HTMLElement | null | undefined>;

  /** Which key phase to listen on. Defaults to `keydown`. */
  readonly eventType?: 'keydown' | 'keyup';
}

/** Reports whether an event target is an editable field where bare-key shortcuts should be suppressed. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    // Buttons/checkboxes/etc. aren't typing contexts — only value-bearing inputs suppress bare shortcuts.
    const type = (target as HTMLInputElement).type;
    return type !== 'button' && type !== 'checkbox' && type !== 'radio' && type !== 'submit' && type !== 'reset';
  }
  return false;
}

/** Whether a chord may fire while a field is focused — Ctrl/Meta combos are allowed through, bare keys are not. */
function firesInEditable(chord: Chord): boolean {
  return chord.ctrl || chord.meta;
}

/** Resolves the node a binding attaches to — the scoped element when `target` is given, else `window`. */
function resolveElement(options: HotkeyOptions | undefined): Window | HTMLElement | null {
  if (options?.target !== undefined) return toValue(options.target) ?? null;
  return typeof window === 'undefined' ? null : window;
}

/**
 * Binds one or more chord strings to a single handler. Multiple chords act as an OR (`['mod+k', 'ctrl+k']`).
 * The chords are parsed in a `computed`, so an inline array literal costs one parse; the handler and the
 * behavioural options are read at event time, so passing fresh closures is fine — the listener is attached
 * once per `target`/`eventType`/platform and reused.
 */
export function useHotkeys(
  chords: MaybeRefOrGetter<string | ReadonlyArray<string>>,
  handler: (event: KeyboardEvent) => void,
  options?: HotkeyOptions,
): void {
  const applePlatform = options?.applePlatform;

  const parsed = computed<Chord[]>(() => {
    const resolved = toValue(chords);
    const list = typeof resolved === 'string' ? [resolved] : resolved;
    return list.map((c) => parseChord(c, { applePlatform }));
  });

  watchPostEffect((onCleanup) => {
    const element = resolveElement(options);
    if (element === null) return;

    const eventType = options?.eventType ?? 'keydown';
    const chordList = parsed.value;

    function onKey(event: KeyboardEvent): void {
      if (event.isComposing || toValue(options?.enabled ?? true) === false) return;

      const ignoreInputs = toValue(options?.ignoreInputs ?? true);
      const inEditable = ignoreInputs && isEditableTarget(event.target);

      for (const chord of chordList) {
        if (!matchesChord(event, chord)) continue;
        if (inEditable && !firesInEditable(chord)) return; // suppressed in a typing context
        if (toValue(options?.preventDefault ?? true) === true) event.preventDefault();
        handler(event);
        return;
      }
    }

    // `target` resolves through `toValue`, so the effect re-attaches when the ref fills, the event phase
    // changes, or the parsed chords change. The handler and the behavioural options are read at event time,
    // so they never force a re-attach.
    element.addEventListener(eventType, onKey as EventListener);
    onCleanup(() => element.removeEventListener(eventType, onKey as EventListener));
  });
}

/** The per-chord handler a keymap holds; a falsy entry is a row the caller has disabled. */
type HotkeyMapHandler = ((event: KeyboardEvent) => void) | false | null | undefined;

/**
 * Binds a map of `chord → handler` — the ergonomic shape for a command palette or editor keymap. Each entry is
 * an independent binding sharing the same `options`. A `false`/`null`/`undefined` handler entry is skipped, so a
 * caller can conditionally disable one row without restructuring the map.
 */
export function useHotkeyMap(
  map: MaybeRefOrGetter<Readonly<Record<string, HotkeyMapHandler>>>,
  options?: HotkeyOptions,
): void {
  const applePlatform = options?.applePlatform;

  const parsed = computed<{ chord: Chord; key: string }[]>(() => {
    const resolved = toValue(map);
    return Object.keys(resolved)
      .filter((c) => typeof resolved[c] === 'function')
      .sort()
      .map((key) => ({ key, chord: parseChord(key, { applePlatform }) }));
  });

  watchPostEffect((onCleanup) => {
    const element = resolveElement(options);
    if (element === null) return;

    const eventType = options?.eventType ?? 'keydown';
    const chordList = parsed.value;

    function onKey(event: KeyboardEvent): void {
      if (event.isComposing || toValue(options?.enabled ?? true) === false) return;

      const ignoreInputs = toValue(options?.ignoreInputs ?? true);
      const inEditable = ignoreInputs && isEditableTarget(event.target);

      for (const { chord, key } of chordList) {
        if (!matchesChord(event, chord)) continue;
        if (inEditable && !firesInEditable(chord)) return;
        const handler = toValue(map)[key];
        if (typeof handler !== 'function') return;
        if (toValue(options?.preventDefault ?? true) === true) event.preventDefault();
        handler(event);
        return;
      }
    }

    element.addEventListener(eventType, onKey as EventListener);
    onCleanup(() => element.removeEventListener(eventType, onKey as EventListener));
  });
}
