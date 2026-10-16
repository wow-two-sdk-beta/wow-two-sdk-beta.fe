// The Vue-free core of the mutation half of this slice. Same contract as `ObserveIntersection`: a disposer, an
// idempotent one, and a no-op rather than a throw when the API is absent.
//
// AN EMPTY INIT IS A `TypeError`, SO IT IS NEVER SENT. `MutationObserver.observe` throws outright unless at least
// one of `childList`, `attributes`, or `characterData` is true — a genuinely surprising failure, because the
// mistake (`observe(el)` with no options, or an options object holding only `subtree`) reads as "watch
// everything". This module defaults to `{ childList: true }` in exactly that case, which is what the caller who
// wrote nothing meant, and turns a runtime crash into a working observer.
//
// THE SPEC'S IMPLICIT FLAGS ARE MADE EXPLICIT. Per DOM, `attributeFilter` implies `attributes: true` and
// `attributeOldValue` implies it too (likewise `characterDataOldValue` → `characterData`). Relying on the
// implication would make the "did the caller request anything?" test above wrong for an options object holding
// only a filter — so the implications are resolved here, before the emptiness check, not left to the engine.
//
// RECORDS ARRIVE BATCHED AND ARE PASSED THROUGH BATCHED. Unlike intersection entries, mutation records are a
// transaction: "these things changed together, in this order". Splitting them into one call per record would
// destroy that grouping and make a consumer that only cares about the net effect re-derive it.

/** The `MutationObserverInit` flags, with a readonly `attributeFilter`. */
export interface MutationOptions {
  /** Watch additions and removals of direct children. Defaults to `true` only when nothing else is requested. */
  readonly childList?: boolean;

  /** Watch attribute changes on the target. Implied by `attributeFilter` / `attributeOldValue`. */
  readonly attributes?: boolean;

  /** Watch text content changes. Implied by `characterDataOldValue`. */
  readonly characterData?: boolean;

  /** Extend every other flag to the whole subtree rather than the target alone. Off on its own — never enough. */
  readonly subtree?: boolean;

  /**
   * Restrict attribute watching to these names, e.g. `['data-state', 'aria-expanded']`. Narrowing this is the
   * cheapest win available: an unfiltered `attributes: true` on a busy node reports every class toggle.
   */
  readonly attributeFilter?: ReadonlyArray<string>;

  /** Include the previous value on each attribute record. */
  readonly attributeOldValue?: boolean;

  /** Include the previous value on each character-data record. */
  readonly characterDataOldValue?: boolean;
}

/** A disposer that is safe to call more than once. */
export type Disposer = () => void;

/** Shared no-op for the unsupported path, so the caller's cleanup is unconditional. */
const NoopDisposer: Disposer = () => {};

/** Whether a usable `MutationObserver` exists — false on the server. */
export function supportsMutationObserver(): boolean {
  return typeof MutationObserver !== 'undefined';
}

/**
 * Normalizes slice options into a valid `MutationObserverInit`, resolving the spec's implied flags and
 * substituting `{ childList: true }` for an init that would otherwise throw.
 *
 * Internal — not exported from the barrel.
 *
 * @param options Slice-level options, or `undefined` for the childList default.
 * @returns An init guaranteed to satisfy `observe`.
 */
export function toMutationInit(options?: MutationOptions): MutationObserverInit {
  const attributes =
    options?.attributes ?? (options?.attributeFilter !== undefined || options?.attributeOldValue === true);
  const characterData = options?.characterData ?? options?.characterDataOldValue === true;
  const childList = options?.childList ?? false;

  // Nothing asked for ⇒ the caller meant "tell me when the children change", not "throw".
  if (!attributes && !characterData && !childList) {
    return { childList: true, subtree: options?.subtree ?? false };
  }

  const init: MutationObserverInit = {
    childList,
    attributes,
    characterData,
    subtree: options?.subtree ?? false,
  };
  if (options?.attributeFilter !== undefined) init.attributeFilter = [...options.attributeFilter];
  if (options?.attributeOldValue !== undefined) init.attributeOldValue = options.attributeOldValue;
  if (options?.characterDataOldValue !== undefined) {
    init.characterDataOldValue = options.characterDataOldValue;
  }
  return init;
}

/**
 * Fingerprints the options so a composable can tell a real config change from a new object literal.
 *
 * Internal — not exported from the barrel.
 *
 * @param options Slice-level options, or `undefined`.
 * @returns A stable string that changes only when a flag actually changes.
 */
export function mutationSignature(options?: MutationOptions): string {
  const init = toMutationInit(options);
  return [
    init.childList === true,
    init.attributes === true,
    init.characterData === true,
    init.subtree === true,
    init.attributeOldValue === true,
    init.characterDataOldValue === true,
    (init.attributeFilter ?? []).join(','),
  ].join('|');
}

/**
 * Observes DOM mutations on a node and returns a disposer.
 *
 * @param node The target to watch. Any `Node` — an element, but a text node or fragment works too.
 * @param callback Receives the batch of records plus the observer, so a caller can stop from inside.
 * @param options Which mutation kinds to report; defaults to `{ childList: true }`.
 * @returns An idempotent disposer. A no-op when `MutationObserver` is unavailable.
 */
export function observeMutation(
  node: Node,
  callback: (records: ReadonlyArray<MutationRecord>, observer: MutationObserver) => void,
  options?: MutationOptions,
): Disposer {
  if (!supportsMutationObserver()) return NoopDisposer;

  let disposed = false;
  const observer = new MutationObserver((records, self) => {
    if (!disposed) callback(records, self);
  });

  observer.observe(node, toMutationInit(options));

  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
  };
}
