// `useVisibility` — HOW MUCH of an element is on screen, as a 0–1 number, where `useInView` answers only whether
// any of it is. Drives scroll-progress bars, parallax and scrub animations, "80% read" analytics, and volume or
// opacity that tracks how much of a player is showing.
//
// IT IS `useInView` WITH A GENERATED THRESHOLD LADDER, NOT A SECOND OBSERVER IMPLEMENTATION. The only real
// difference between the two composables is how many thresholds the observer was built with — the lifecycle
// (element changes, `once`, `disabled`, unsupported-fails-open, teardown) is identical, and a second copy of it
// would be a second set of the subtle bugs that lifecycle exists to prevent. So the whole composable is: pick
// the ladder, delegate, read `intersectionRatio` off the entry.
//
// `threshold` IS DELIBERATELY NOT ACCEPTED. It is the one option this composable computes from `steps`; letting
// a caller pass both would mean silently ignoring one of them. `Omit`ing it makes that a compile error instead.
//
// THE RATIO IS READ FROM THE ENTRY, NOT ACCUMULATED. The browser already computed it; tracking it separately
// would drift the moment a callback is coalesced or arrives out of order.

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { useInView, type UseInViewOptions } from './UseInView';
import { visibilityThresholds } from '../VisibilitySteps';

/** Sampling resolution when `steps` is omitted — 5% granularity, fine enough for a progress readout. */
const DefaultSteps = 20;

/** Everything `useInView` takes except `threshold`, which `steps` replaces. */
export interface UseVisibilityOptions extends Omit<UseInViewOptions, 'threshold'> {
  /**
   * How many intervals to sample `0`–`1` in. Higher = smoother `ratio`, more callbacks, more updates.
   * Defaults to `20` (5% granularity); clamped to `1`–`100`.
   */
  readonly steps?: number;
}

/** What `useVisibility` returns. */
export interface VisibilityState {
  /**
   * Visible fraction of the element, `0`–`1`, quantized to the `steps` ladder. `1` when the API is unavailable
   * and the fallback reports the element as visible.
   */
  readonly ratio: ComputedRef<number>;

  /** Whether any part meets the lowest threshold — the same boolean `useInView` returns. */
  readonly inView: ComputedRef<boolean>;

  /** The entry behind the current values, or `null` before the first callback / when unsupported. */
  readonly entry: ComputedRef<IntersectionObserverEntry | null>;
}

/**
 * Tracks what fraction of the element behind `target` is visible.
 *
 * Updates once per crossed step, so a full scroll-through of the default ladder is ~20 updates rather than
 * the 2 a plain `useInView` would give.
 *
 * @param target Points at the element to watch. Changing it re-observes.
 * @param options `steps` plus root / margin / `once` / `disabled` / `fallbackInView`.
 * @returns `{ ratio, inView, entry }`.
 */
export function useVisibility<T extends Element>(
  target: MaybeRefOrGetter<T | null | undefined>,
  options?: MaybeRefOrGetter<UseVisibilityOptions | undefined>,
): VisibilityState {
  // A getter, so a changed `steps` rebuilds the ladder and re-subscribes through `useInView`'s own effect.
  const { inView, entry } = useInView(target, () => {
    const opts = toValue(options);
    return { ...opts, threshold: visibilityThresholds(opts?.steps ?? DefaultSteps) };
  });

  // No entry yet ⇒ derive from the boolean, so the unsupported fail-open path reports a full 1 rather than a 0
  // that would read as "scrolled past" to a progress consumer.
  const ratio = computed(() => entry.value?.intersectionRatio ?? (inView.value ? 1 : 0));

  return { ratio, inView, entry };
}
