// `useInView` — "is this element on screen?" as a boolean, over `observeIntersection`. The primitive under
// lazy-loading, reveal-on-scroll, infinite-scroll sentinels, and autoplay-when-visible.
//
// THE WHOLE REF-DIFFING MACHINE THE REACT ORIGINAL NEEDED IS GONE, and its absence is the point. There, a
// `RefObject` mutation does not re-render, so the hook had to run an effect after EVERY render and diff
// `ref.current` against what was actually observed — otherwise it kept observing a node detached three renders
// ago and reported a stale `false` for an element that IS on screen. In Vue a template ref is itself reactive,
// so `watchPostEffect` re-runs precisely when the element changes and never otherwise. Options are read through
// `toValue` in the same effect, so a changed threshold re-subscribes for free — no fingerprint comparison, no
// no-deps effect, no separate unmount-only cleanup.
//
// POST-FLUSH, so the element is in the DOM before the observer attaches — the same reason
// `foundation/observers`' `useResizeObserver` is post-flush. Under SSR the target resolves to `null` and the effect
// returns before touching `IntersectionObserver`.
//
// UNSUPPORTED FAILS OPEN, AND FAILS OPEN FROM THE EFFECT. `inView: false` is right while the answer is unknown
// but wrong forever: reveal-on-scroll content stays invisible and lazy images never load, i.e. the page is
// broken for the user with the oldest browser. So when `IntersectionObserver` is missing the state reports
// `true` (`fallbackInView`, opt-out). It does that from the EFFECT, never from the seed value, because the
// effect does not run on the server — computing the fallback at setup would make the server emit `true` and the
// client hydrate `false`, which is a hydration mismatch.
//
// `once` DISCONNECTS PERMANENTLY, including across a later element change. A reveal that un-reveals is a bug,
// and a lazy-loaded image does not need un-loading; keeping the observer alive after the first hit is pure cost
// on the scroll path where cost is most visible.

import { computed, shallowRef, toValue, watchPostEffect, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { observeIntersection, supportsIntersectionObserver, type IntersectionOptions } from '../ObserveIntersection';

/** Root/margin/threshold plus the lifecycle knobs the composable adds. */
export interface UseInViewOptions extends IntersectionOptions {
  /**
   * Stop observing permanently after the first intersection. The state stays `true` from then on, even if the
   * element scrolls away or `target` is later pointed at a different node. Use for anything that should happen
   * once — lazy loads, entrance animations, "seen" analytics.
   */
  readonly once?: boolean;

  /** Suspend observation without tearing down. Flipping it back re-observes the current target. */
  readonly disabled?: boolean;

  /**
   * What `inView` reports when `IntersectionObserver` does not exist in this environment. Defaults to `true`
   * (fail open — show the content). Set `false` only when hidden is the safer wrong answer.
   */
  readonly fallbackInView?: boolean;
}

/** What `useInView` returns. */
export interface InViewState {
  /** Whether the element currently meets the threshold. */
  readonly inView: ComputedRef<boolean>;

  /**
   * The entry behind the current value — `intersectionRatio`, `boundingClientRect`, `time`. `null` before the
   * observer's first callback and whenever the API is unavailable.
   */
  readonly entry: ComputedRef<IntersectionObserverEntry | null>;
}

/** The reactive snapshot both fields are derived from — one write keeps the pair consistent. */
interface InViewSnapshot {
  readonly inView: boolean;
  readonly entry: IntersectionObserverEntry | null;
}

/** Pre-observation state. Module-level so the identity is stable across instances. */
const InitialState: InViewSnapshot = { inView: false, entry: null };

/**
 * Tracks whether the element behind `target` is intersecting the root.
 *
 * Takes the element as a ref or getter rather than handing one back, so the caller keeps ownership of its
 * `useTemplateRef`. The first callback arrives asynchronously (a frame or so after mount), so `inView` is
 * `false` on the very first read even for an element sitting in the middle of the viewport — assert against it
 * with `waitFor`, never synchronously.
 *
 * @param target Points at the element to watch. Changing it re-observes.
 * @param options Root, margin, threshold, plus `once` / `disabled` / `fallbackInView`.
 * @returns `{ inView, entry }`, updating only when `isIntersecting` or `intersectionRatio` actually changes.
 */
export function useInView<T extends Element>(
  target: MaybeRefOrGetter<T | null | undefined>,
  options?: MaybeRefOrGetter<UseInViewOptions | undefined>,
): InViewState {
  const state = shallowRef<InViewSnapshot>(InitialState);

  /** `once` already fired — this composable is done for good, across every later element change. */
  let settled = false;

  watchPostEffect((onCleanup) => {
    if (settled) return;

    const opts = toValue(options);
    const element = opts?.disabled === true ? null : toValue(target);
    if (!element) return;

    if (!supportsIntersectionObserver()) {
      const fallback = opts?.fallbackInView ?? true;
      if (state.value.inView !== fallback || state.value.entry !== null) {
        state.value = { inView: fallback, entry: null };
      }
      return;
    }

    const dispose = observeIntersection(
      element,
      (entry) => {
        const previous = state.value;
        if (
          previous.entry?.isIntersecting !== entry.isIntersecting ||
          previous.entry?.intersectionRatio !== entry.intersectionRatio
        ) {
          state.value = { inView: entry.isIntersecting, entry };
        }

        if (entry.isIntersecting && toValue(options)?.once === true) {
          settled = true;
          dispose();
        }
      },
      opts,
    );

    onCleanup(dispose);
  });

  return {
    inView: computed(() => state.value.inView),
    entry: computed(() => state.value.entry),
  };
}
