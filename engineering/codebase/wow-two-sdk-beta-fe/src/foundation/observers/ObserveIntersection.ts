// The Vue-free core of the intersection half of this slice. Every composable here is a thin lifecycle wrapper over
// `observeIntersection`, which means a router guard, an analytics probe, or a plain script can watch an element
// without pulling Vue in — and means the observer's own semantics are proven in one place rather than three.
//
// A DISPOSER, NOT AN OBSERVER, IS RETURNED. Handing back the `IntersectionObserver` would invite callers to keep
// observing other elements on it, and then a single `disconnect()` from one owner would silently stop everybody
// else's. A disposer is the smallest capability that still cleans up, and it is idempotent so a double-dispose
// (a watcher re-run that cleans up twice, a `finally` that also runs on the happy path) is not an error.
//
// ABSENT API ⇒ A NO-OP DISPOSER, NEVER A THROW. On the server there is no `IntersectionObserver` at all, and in a
// pre-2019 browser there is none either. Both are the same shape of problem — the element can never be reported
// as intersecting — so both take the same branch. Callers decide what "unknown visibility" means for them; see
// `fallbackInView` in `UseInView`, which fails OPEN so reveal-on-scroll content is never stranded invisible.
//
// THRESHOLDS ARE COPIED ON THE WAY IN. `IntersectionObserverInit.threshold` is a mutable `number[]` in lib.dom,
// but this slice accepts `readonly number[]` so a consumer can pass a frozen module constant. The copy is what
// bridges the two, and it also stops the browser from ever holding a reference to a caller's array.

/** Root, margin, and threshold — the three knobs `IntersectionObserver` itself takes, with readonly thresholds. */
export interface IntersectionOptions {
  /**
   * Element (or document) whose bounds define "in view". Defaults to the browser viewport when `null`/omitted.
   * Must be an ancestor of every observed target, or the browser reports nothing.
   */
  readonly root?: Element | Document | null;

  /**
   * CSS-margin string that grows or shrinks the root box before intersection is computed — e.g. `'200px'` to
   * start loading an image a screen early, `'-50%'` to fire only past the halfway line. Defaults to `'0px'`.
   */
  readonly rootMargin?: string;

  /**
   * Visible fraction(s), each `0`–`1`, at which the callback fires. A single number fires on crossing it in
   * either direction; an array fires at every listed step. Defaults to `0` (any pixel).
   */
  readonly threshold?: number | ReadonlyArray<number>;
}

/** A disposer that is safe to call more than once. */
export type Disposer = () => void;

/** Shared no-op for the unsupported path, so the caller's cleanup is unconditional. */
const NoopDisposer: Disposer = () => {};

/** Whether a usable `IntersectionObserver` exists — false on the server and in pre-2019 browsers. */
export function supportsIntersectionObserver(): boolean {
  return typeof IntersectionObserver !== 'undefined';
}

/**
 * Normalizes this slice's options into the mutable init the DOM constructor demands.
 *
 * Internal — not exported from the barrel. Shared so the single- and multi-element paths can never configure
 * their observers differently.
 *
 * @param options Slice-level options, or `undefined` for all defaults.
 * @returns An init object with `threshold` copied into a mutable array when it was a list.
 */
export function toIntersectionInit(options?: IntersectionOptions): IntersectionObserverInit {
  const threshold = options?.threshold;
  const init: IntersectionObserverInit = {
    root: options?.root ?? null,
    rootMargin: options?.rootMargin ?? '0px',
    threshold: typeof threshold === 'number' ? threshold : [...(threshold ?? [0])],
  };
  return init;
}

/**
 * Fingerprints the scalar options so a composable can tell a real config change from a new object literal.
 *
 * Internal — not exported from the barrel. `root` is deliberately absent: it is an object, so composables compare it by
 * identity alongside this string rather than trying to stringify a DOM node.
 *
 * @param options Slice-level options, or `undefined`.
 * @returns A stable string that changes only when `rootMargin` or `threshold` actually changes.
 */
export function intersectionSignature(options?: IntersectionOptions): string {
  const threshold = options?.threshold;
  const thresholdKey = typeof threshold === 'number' ? String(threshold) : (threshold ?? [0]).join(',');
  return `${options?.rootMargin ?? '0px'}|${thresholdKey}`;
}

/**
 * Observes one element's intersection with a root and returns a disposer.
 *
 * The callback is invoked once per entry (not once per batch), because a single-element observer receiving a
 * batch means the browser coalesced several crossings and the caller wants each of them.
 *
 * Fires an initial entry asynchronously shortly after observation begins, describing the element's CURRENT
 * state — so a consumer never has to measure the first frame by hand.
 *
 * @param element The target to watch.
 * @param callback Receives each entry plus the observer, so `once`-style callers can stop from inside.
 * @param options Root, margin, threshold.
 * @returns An idempotent disposer. A no-op when `IntersectionObserver` is unavailable.
 */
export function observeIntersection(
  element: Element,
  callback: (entry: IntersectionObserverEntry, observer: IntersectionObserver) => void,
  options?: IntersectionOptions,
): Disposer {
  if (!supportsIntersectionObserver()) return NoopDisposer;

  let disposed = false;
  const observer = new IntersectionObserver((entries, self) => {
    for (const entry of entries) {
      if (!disposed) callback(entry, self);
    }
  }, toIntersectionInit(options));

  observer.observe(element);

  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
  };
}
