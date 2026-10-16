// The engine both history flavors run on — one linear entry list plus one pointer, and every branch rule
// (truncate · evict · coalesce · group) implemented exactly once. The command flavor and the snapshot flavor
// differ only in what an entry's payload is and how two payloads merge; they must never differ in when the
// redo branch dies, so that decision lives here and nowhere else.
//
// The model is an array + an `index` cursor, not a past/future pair of stacks. `entries.slice(0, index)` is
// applied, `entries.slice(index)` is redoable. One array means truncation is `entries.length = index` — the
// single most important rule in an undo stack, expressed as one line that cannot drift between flavors.
//
// Non-obvious decisions:
// - The store is exposed through GETTERS (`canUndo`, `size`, `undoLabel`), not snapshot values. A history is a
//   long-lived mutable object a toolbar re-reads after every notification; a frozen boolean would be stale the
//   moment anything pushed. This is also why a facade must delegate getter-by-getter — a spread would evaluate
//   each one once and bake the answer in.
// - `version()` sits alongside `subscribe()` for the same reason `CommandRegistry` has one: a subscribing
//   composable re-reads after every notification, and a value with fresh identity per call would look changed
//   every time. The monotonic revision is the identity-stable cursor a composable subscribes to.
// - Coalescing anchors on the LAST PUSH, and any undo / redo / clear drops the anchor. Merging a fresh keystroke
//   into an entry the user just travelled back through would rewrite history they are currently inspecting.
// - A failed `undo` / `redo` leaves the cursor exactly where it was and reports through `onError`. A half-moved
//   pointer is worse than a failed undo: every later entry would then revert against a state that never existed.
// - `transact` flattens by depth counter rather than by nesting entries. A nested group is a caller's structural
//   detail; the user pressing ⌘Z wants the OUTERMOST intent reversed in one step, so inner labels are dropped.
// - A transaction whose body throws still commits what it buffered. The mutations already landed in the world —
//   discarding them would leave the stack unable to reverse work that actually happened.

/** Notified after any change to a history — push, undo, redo, or clear. Carries no payload; re-read the store. */
export type HistoryListener = () => void;

/** Identifies which direction of travel threw, so an `onError` handler can word its message. */
export const HistoryPhase = {
  /** The failure came from an entry's `undo` work. */
  Undo: 'undo',
  /** The failure came from an entry's `do` work, replayed by `redo()`. */
  Redo: 'redo',
} as const;

export type HistoryPhase = (typeof HistoryPhase)[keyof typeof HistoryPhase];

/** Receives an error thrown while travelling the stack, alongside the direction that threw. */
export type HistoryErrorHandler = (error: unknown, phase: HistoryPhase) => void;

/** The default coalescing window — roughly one typing burst, so a typed word collapses into one undo step. */
export const DefaultCoalesceMs = 500;

/** Tunes a history at creation. Every field is optional; the default is an unbounded, 500 ms-coalescing history. */
export interface HistoryOptions {
  /**
   * Caps how many entries are retained. Exceeding it discards the OLDEST entry, so recent work always survives.
   * Omitted → unbounded.
   */
  readonly limit?: number;

  /**
   * How long after an entry a same-keyed push still merges into it, in milliseconds.
   * Defaults to {@link DefaultCoalesceMs}. Only pushes carrying a `coalesceKey` are ever candidates.
   */
  readonly coalesceMs?: number;

  /** Where an error thrown by an entry's `do` / `undo` work is reported. Omitted → the failure is swallowed. */
  readonly onError?: HistoryErrorHandler;

  /** The clock coalescing measures against. Defaults to `Date.now`; inject one to make the window deterministic. */
  readonly now?: () => number;
}

/** The minimum surface a keybinding, toolbar, or menu needs — satisfied by both history flavors. */
export interface UndoRedoTarget {
  /** Reverses the most recent entry. Returns whether anything was undone (`false` at the bottom, or on failure). */
  readonly undo: () => boolean;

  /** Re-applies the next entry on the redo branch. Returns whether anything was redone. */
  readonly redo: () => boolean;

  /** Whether an entry is available to undo. */
  readonly canUndo: boolean;

  /** Whether an entry is available to redo. */
  readonly canRedo: boolean;
}

/** Everything both flavors share — travel, grouping, introspection, and change notification. */
export interface HistoryStore extends UndoRedoTarget {
  /**
   * Groups every push made inside `fn` into ONE reversible entry labelled `label`, and returns `fn`'s result.
   * Nested calls flatten into the outermost group. A throwing `fn` still commits what it buffered, then rethrows.
   */
  readonly transact: <TResult>(label: string | undefined, fn: () => TResult) => TResult;

  /** Drops every entry (both directions). State already applied stays applied — this forgets, it does not revert. */
  readonly clear: () => void;

  /** Subscribes to changes; returns an unsubscribe. */
  readonly subscribe: (listener: HistoryListener) => () => void;

  /** A monotonic counter bumped on every change — the identity-stable snapshot the composables subscribe to. */
  readonly version: () => number;

  /** How many entries are retained across both directions — what a history panel lists. */
  readonly size: number;

  /** The label of the entry `undo()` would reverse — the text for an "Undo {label}" menu item. */
  readonly undoLabel: string | undefined;

  /** The label of the entry `redo()` would re-apply. */
  readonly redoLabel: string | undefined;
}

/** One entry as handed to the core — the flavor supplies the payload, the core owns everything else. */
export interface HistoryPushRequest<TPayload> {
  /** Human label for menus and history panels. */
  readonly label?: string;

  /** The flavor-specific work or state this entry carries. */
  readonly payload: TPayload;

  /** Merges this push into the previous entry when they share the key and land inside the coalescing window. */
  readonly coalesceKey?: string;
}

/** The core store — a {@link HistoryStore} plus the payload-level `push` each flavor wraps in its own API. */
export interface HistoryCore<TPayload> extends HistoryStore {
  /** Records one entry, applying the truncate / evict / coalesce / buffer rules. Never runs the payload. */
  readonly push: (request: HistoryPushRequest<TPayload>) => void;
}

/** How a flavor teaches the core to travel over, and merge, its own payload type. */
export interface HistoryCoreConfig<TPayload> {
  /** Moves the world forward over a payload — the redo direction. May throw; the core keeps the cursor put. */
  readonly applyForward: (payload: TPayload) => void;

  /** Moves the world backward over a payload — the undo direction. May throw; the core keeps the cursor put. */
  readonly applyBackward: (payload: TPayload) => void;

  /** Fuses two adjacent payloads into one that travels like both — used by coalescing and by `transact`. */
  readonly mergePayloads: (previous: TPayload, next: TPayload) => TPayload;

  /** The creation-time options, read live on every use so a flavor can pass its caller's object straight through. */
  readonly options: HistoryOptions | undefined;
}

/** One retained entry. Mutable because coalescing replaces the payload of the entry already on the stack. */
interface CoreEntry<TPayload> {
  label: string | undefined;
  payload: TPayload;
  coalesceKey: string | undefined;
}

/**
 * Builds the shared engine. Not exported from the slice barrel — consumers take `createUndoHistory` or
 * `createSnapshotHistory`, which are this core plus a payload type.
 */
export function createHistoryCore<TPayload>(config: HistoryCoreConfig<TPayload>): HistoryCore<TPayload> {
  const { applyForward, applyBackward, mergePayloads, options } = config;

  const listeners = new Set<HistoryListener>();
  const entries: CoreEntry<TPayload>[] = [];

  /** How many entries are applied — the cursor. Everything at or after it is the redo branch. */
  let cursor = 0;
  let revision = 0;

  /** Transaction nesting depth; pushes buffer instead of committing while it is above zero. */
  let depth = 0;
  let buffer: CoreEntry<TPayload>[] = [];
  let bufferLabel: string | undefined;

  /** The coalescing anchor — the key of the last committed push and when it landed. */
  let anchorKey: string | undefined;
  let anchorAt = 0;

  /** Reads the injected clock, falling back to wall time. */
  function now(): number {
    return options?.now?.() ?? Date.now();
  }

  /** Bumps the revision then fans out over a copy, so a listener may unsubscribe while being notified. */
  function notify(): void {
    revision += 1;
    for (const listener of [...listeners]) listener();
  }

  /** Ends the run of consecutive pushes — travel or a reset must not leave a merge target behind. */
  function dropAnchor(): void {
    anchorKey = undefined;
  }

  /** Enforces `limit` by discarding from the front; the cursor follows so it keeps pointing at the same entry. */
  function evict(): void {
    const limit = options?.limit;
    if (limit === undefined || !Number.isFinite(limit)) return;
    const max = Math.max(0, limit);
    while (entries.length > max) {
      entries.shift();
      cursor = Math.max(0, cursor - 1);
    }
  }

  /** Places an entry on the stack — the only place the redo branch is truncated. */
  function commit(entry: CoreEntry<TPayload>): void {
    const at = now();
    const previous = cursor > 0 ? entries.at(cursor - 1) : undefined;
    const canCoalesce =
      entry.coalesceKey !== undefined &&
      entry.coalesceKey === anchorKey &&
      previous !== undefined &&
      // Nothing may sit on the redo branch: the anchor must still be the top of the stack.
      cursor === entries.length &&
      at - anchorAt <= (options?.coalesceMs ?? DefaultCoalesceMs);

    if (canCoalesce && previous !== undefined) {
      entries[cursor - 1] = {
        // The first label of a run wins — "Typing" should not be relabelled by its eighth keystroke.
        label: previous.label ?? entry.label,
        payload: mergePayloads(previous.payload, entry.payload),
        coalesceKey: entry.coalesceKey,
      };
      anchorAt = at;
      notify();
      return;
    }

    // The rule everything else defers to: recording after an undo kills whatever was ahead of the cursor.
    entries.length = cursor;
    entries.push(entry);
    cursor = entries.length;
    anchorKey = entry.coalesceKey;
    anchorAt = at;
    evict();
    notify();
  }

  /** Collapses a transaction's buffer into one entry and commits it. A group never coalesces — it IS the grouping. */
  function flush(): void {
    const grouped = buffer;
    buffer = [];
    const first = grouped.at(0);
    if (first === undefined) return;

    const payload = grouped.slice(1).reduce((merged, entry) => mergePayloads(merged, entry.payload), first.payload);

    commit({ label: bufferLabel ?? first.label, payload, coalesceKey: undefined });
  }

  return {
    push(request: HistoryPushRequest<TPayload>): void {
      const entry: CoreEntry<TPayload> = {
        label: request.label,
        payload: request.payload,
        coalesceKey: request.coalesceKey,
      };
      // Inside a transaction nothing reaches the stack until the outermost body returns.
      if (depth > 0) {
        buffer.push(entry);
        return;
      }
      commit(entry);
    },

    transact<TResult>(label: string | undefined, fn: () => TResult): TResult {
      // Only the outermost call owns the buffer and the label — that is the whole of the flattening rule.
      if (depth === 0) bufferLabel = label;
      depth += 1;
      try {
        return fn();
      } finally {
        depth -= 1;
        if (depth === 0) {
          // In `finally` on purpose: a throwing body still leaves real mutations that must stay reversible.
          flush();
          bufferLabel = undefined;
        }
      }
    },

    undo(): boolean {
      if (cursor === 0) return false;
      const entry = entries.at(cursor - 1);
      if (entry === undefined) return false;
      try {
        applyBackward(entry.payload);
      } catch (error) {
        // Cursor untouched — the entry stays undoable so a caller can fix the cause and retry.
        options?.onError?.(error, HistoryPhase.Undo);
        return false;
      }
      cursor -= 1;
      dropAnchor();
      notify();
      return true;
    },

    redo(): boolean {
      const entry = entries.at(cursor);
      if (cursor >= entries.length || entry === undefined) return false;
      try {
        applyForward(entry.payload);
      } catch (error) {
        options?.onError?.(error, HistoryPhase.Redo);
        return false;
      }
      cursor += 1;
      dropAnchor();
      notify();
      return true;
    },

    clear(): void {
      entries.length = 0;
      buffer = [];
      bufferLabel = undefined;
      cursor = 0;
      dropAnchor();
      notify();
    },

    subscribe(listener: HistoryListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    version(): number {
      return revision;
    },

    get canUndo(): boolean {
      return cursor > 0;
    },

    get canRedo(): boolean {
      return cursor < entries.length;
    },

    get size(): number {
      return entries.length;
    },

    get undoLabel(): string | undefined {
      return cursor > 0 ? entries.at(cursor - 1)?.label : undefined;
    },

    get redoLabel(): string | undefined {
      return entries.at(cursor)?.label;
    },
  };
}
