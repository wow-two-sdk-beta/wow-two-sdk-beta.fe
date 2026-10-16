// `useIntersectionObserver` — the MULTI-element form: many targets, ONE observer, one callback.
//
// AN OBSERVER PER LIST ITEM IS THE CLASSIC PERFORMANCE MISTAKE THIS COMPOSABLE EXISTS TO PREVENT. Reaching for
// `useInView` inside a row component feels natural and scales badly: a 500-row table builds 500 observers, and
// the browser then walks 500 separate observation sets on every scroll-driven intersection pass instead of one.
// The API is explicitly built for the many-target case — `observe()` takes an element, and a single observer
// delivers ALL of their entries in one batched callback. That batching is the win, and it only exists if the
// targets share an observer.
//
// THE OBSERVER SURVIVES TARGET CHURN. Rows mount and unmount constantly; rebuilding the observer for each would
// throw away the batching AND re-fire an initial callback for every surviving target. So the effect diffs the
// live target set against what is currently observed and issues only `observe()` / `unobserve()` for the delta.
// A new observer is constructed exactly once per options change — nothing else. That is why the observer and
// its observed set live OUTSIDE the effect and the teardown hangs off `onScopeDispose` rather than the
// watcher's `onCleanup`: a per-run cleanup would be the churn this design exists to avoid.
//
// NO `once` HERE, ON PURPOSE. It is per-TARGET state, and this composable shares one observer across all of
// them: honouring it would mean either disconnecting everybody on the first target's hit, or tracking a
// per-element settled set — which is `useInView` per item, i.e. the thing this composable exists to avoid. A
// consumer wanting once-per-row semantics keeps that bookkeeping in its own state, where the row identity
// already lives.
//
// POST-FLUSH, and the targets are read through `toValue`, so the effect re-runs exactly when the reactive target
// list changes. Under SSR the list resolves empty and nothing is constructed.

import { onScopeDispose, toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

import {
  intersectionSignature,
  supportsIntersectionObserver,
  toIntersectionInit,
  type IntersectionOptions,
} from '../ObserveIntersection';

/** Root/margin/threshold plus the one lifecycle knob that makes sense for a shared observer. */
export interface UseIntersectionObserverOptions extends IntersectionOptions {
  /** Suspend observation of every target without tearing down. Flipping it back re-observes them all. */
  readonly disabled?: boolean;
}

/**
 * Observes many elements through a single `IntersectionObserver`.
 *
 * The callback fires once per entry, and `entry.target` identifies which element it belongs to — the usual
 * consumer keeps a `Map` from element to row id, or compares against its own refs.
 *
 * @param targets The elements to observe, as a ref or getter over the list. Nulls are skipped.
 * @param callback Receives each entry plus the shared observer.
 * @param options Root, margin, threshold, `disabled`.
 */
export function useIntersectionObserver(
  targets: MaybeRefOrGetter<readonly (Element | null | undefined)[]>,
  callback: (entry: IntersectionObserverEntry, observer: IntersectionObserver) => void,
  options?: MaybeRefOrGetter<UseIntersectionObserverOptions | undefined>,
): void {
  let observer: IntersectionObserver | null = null;
  const observed = new Set<Element>();
  let signature: string | null = null;
  let root: Element | Document | null = null;

  /** Drops the observer and forgets every target. */
  function teardown(): void {
    observer?.disconnect();
    observer = null;
    observed.clear();
  }

  watchPostEffect(() => {
    const opts = toValue(options);
    const nextSignature = intersectionSignature(opts);
    const nextRoot = opts?.root ?? null;

    // Observer init is immutable once constructed, so an options change is the one thing that forces a rebuild.
    if (nextSignature !== signature || nextRoot !== root) {
      teardown();
      signature = nextSignature;
      root = nextRoot;
    }

    const next = new Set<Element>();
    if (opts?.disabled !== true) {
      for (const element of toValue(targets)) {
        if (element) next.add(element);
      }
    }

    if (next.size === 0) {
      teardown();
      return;
    }
    if (!supportsIntersectionObserver()) return;

    const current =
      observer ??
      new IntersectionObserver((entries, self) => {
        for (const entry of entries) {
          if (observer === self && observed.has(entry.target)) callback(entry, self);
        }
      }, toIntersectionInit(opts));
    observer = current;

    // Snapshot before mutating — deleting from a Set mid-iteration is legal but reads as a trap.
    for (const element of [...observed]) {
      if (!next.has(element)) {
        current.unobserve(element);
        observed.delete(element);
      }
    }
    for (const element of next) {
      if (!observed.has(element)) {
        current.observe(element);
        observed.add(element);
      }
    }
  });

  onScopeDispose(teardown);
}
