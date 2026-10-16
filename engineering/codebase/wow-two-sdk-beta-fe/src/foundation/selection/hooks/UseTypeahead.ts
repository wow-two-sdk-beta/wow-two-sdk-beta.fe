import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';

/** Resolves the typeahead item pool — a static array, a ref, or a getter read lazily on each keystroke. */
type ItemSource<T> = MaybeRefOrGetter<ReadonlyArray<T>>;

/** Configures {@link useTypeahead}. `T` is the item type the caller stores per option. */
export interface UseTypeaheadOptions<T> {
  /** Supplies the items to match against; a ref or function is re-read on every keystroke (live lists). */
  items: ItemSource<T>;

  /** Extracts the comparable label from an item. Matching is case-insensitive on this string. */
  getLabel: (item: T) => string;

  /** Reports whether an item is disabled; disabled items are skipped during matching. */
  isDisabled?: (item: T) => boolean;

  /** Fires with the matched item and its index in the (live) item array when a keystroke resolves. */
  onMatch: (item: T, index: number) => void;

  /** Returns the index of the currently-active item — same-letter cycling starts after it. */
  getActiveIndex?: () => number;

  /** Disables the matcher when `false`; every key falls through unhandled. Defaults to `true`. */
  enabled?: MaybeRefOrGetter<boolean>;

  /** Idle time (ms) after which the typed buffer resets. Defaults to `500`. */
  timeout?: MaybeRefOrGetter<number>;
}

/** The keyboard handler + manual reset returned by {@link useTypeahead}. */
export interface UseTypeaheadReturn {
  /** Feeds a keydown into the matcher. Returns `true` when consumed (caller should stop), else `false`. */
  onKeyDown: (event: KeyboardEvent) => boolean;

  /** Clears the typed buffer immediately (e.g. on blur / close). */
  reset: () => void;
}

/** Reports whether a key event carries a single printable character (and no command modifier). */
function isPrintableKey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  // Printable keys surface as a single char in `key`; named keys (Enter, ArrowDown…) are multi-char.
  return event.key.length === 1;
}

/** Reports whether every char in the buffer is the same letter — the "cycle" case (e.g. "aaa"). */
function isAllSameChar(buffer: string): boolean {
  return buffer.length > 0 && [...buffer].every((c) => c === buffer[0]);
}

/**
 * APG-correct type-to-select matcher (WAI-ARIA listbox/combobox typeahead). Accumulates printable
 * chars into a buffer (resets after `timeout` ms idle): a repeated single char cycles to the next
 * label starting with it (after `getActiveIndex()`, wrap-around), else prefix-matches the whole
 * buffer case-insensitively; disabled items skipped. On a hit `onMatch(item, index)` fires; consumed
 * keys return `true`, others `false` to fall through. Space is typeable only while buffering (a
 * leading Space reaches the caller). SSR-safe; reset timer cleared when the scope is disposed.
 *
 * `items`, `enabled` and `timeout` may each be a ref or getter and are read per keystroke, so the
 * matcher tracks a live list without the original's options-in-a-ref indirection. The callbacks
 * (`getLabel`, `onMatch`, …) are read off the options object at call time — pass a `reactive`
 * options object if they must be swappable.
 */
export function useTypeahead<T>(options: UseTypeaheadOptions<T>): UseTypeaheadReturn {
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const isEnabled = (): boolean => toValue(options.enabled ?? true);

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function reset(): void {
    buffer = '';
    clearTimer();
  }

  /* Clears the pending reset timer on teardown (no stale fire after the scope is gone). */
  onScopeDispose(clearTimer);

  function onKeyDown(event: KeyboardEvent): boolean {
    if (!isEnabled() || event.isComposing) return false;
    if (!isPrintableKey(event)) return false;

    const isSpace = event.key === ' ';
    const hasBuffer = buffer.length > 0;
    /* Reserve Space: with no active buffer, hand it back so the caller can select; while typing,
       a Space is a real character (matches labels with spaces) and is consumed. */
    if (isSpace && !hasBuffer) return false;

    const list = toValue(options.items);
    if (list.length === 0) return false;

    const nextBuffer = buffer + event.key;
    buffer = nextBuffer;

    /* Restart the idle window on every accepted keystroke. */
    clearTimer();
    timer = setTimeout(
      () => {
        buffer = '';
        timer = null;
      },
      toValue(options.timeout ?? 500),
    );

    const labelOf = (item: T): string => options.getLabel(item).toLowerCase();
    const disabledOf = (item: T): boolean => (options.isDisabled ? options.isDisabled(item) : false);
    const startFrom = options.getActiveIndex ? options.getActiveIndex() : -1;

    let matchIndex = -1;
    if (isAllSameChar(nextBuffer)) {
      /* Same-letter repeat → cycle to the next label starting with that letter, after the active one. */
      const char = nextBuffer[0]!.toLowerCase();
      for (let step = 1; step <= list.length; step += 1) {
        const idx = (startFrom + step + list.length) % list.length;
        const item = list[idx]!;
        if (!disabledOf(item) && labelOf(item).startsWith(char)) {
          matchIndex = idx;
          break;
        }
      }
    } else {
      /* Multi-char buffer → prefix-match the whole buffer; scan from the current item forward so a
         refining sequence stays put when the active item still matches. */
      const prefix = nextBuffer.toLowerCase();
      const begin = startFrom < 0 ? 0 : startFrom;
      for (let step = 0; step < list.length; step += 1) {
        const idx = (begin + step) % list.length;
        const item = list[idx]!;
        if (!disabledOf(item) && labelOf(item).startsWith(prefix)) {
          matchIndex = idx;
          break;
        }
      }
    }

    if (matchIndex >= 0) {
      options.onMatch(list[matchIndex]!, matchIndex);
      return true;
    }
    /* No label matched, but the char was consumed into the buffer (and Space, once buffering,
       must not double as select) — report handled so the caller doesn't also act on it. */
    return true;
  }

  /* `enabled` toggling off mid-type should not leave a stale buffer/timer armed. */
  watch(isEnabled, (nowEnabled) => {
    if (!nowEnabled) reset();
  });

  return { onKeyDown, reset };
}
