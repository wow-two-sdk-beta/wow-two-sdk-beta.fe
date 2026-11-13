/** A window over a series of items: which ones it covers, and where the current one sits among them. */
export interface SlidingWindow {
  /** The index of the window's first item. */
  readonly start: number;

  /** How many items the window covers: the requested size, or the whole series when it is shorter. */
  readonly size: number;

  /** The current item's index, clamped into the series. */
  readonly current: number;

  /** Where the current item sits inside the window, counted from its first item. */
  readonly offset: number;

  /** Whether items of the series lie before the window. */
  readonly hasBefore: boolean;

  /** Whether items of the series lie after the window. */
  readonly hasAfter: boolean;
}

/** Reads a whole number, or the fallback when the value is not finite. */
function wholeOf(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

/**
 * Chooses the window of `size` items that follows the current item through a series of `count`. The window keeps the
 * current item in its middle while it can; at either end of the series it stops moving and the current item drifts
 * toward that edge. An even `size` puts the current item one place before the middle. A `size` larger than the series
 * covers all of it. A pure function of three numbers: the same input always gives the same window, nothing is held
 * between calls, and a non-finite or out-of-range input is clamped instead of thrown.
 *
 * With 10 items and the third current, a window of 3 covers items 2 to 4 with the current one in the middle, and a
 * window of 5 covers items 1 to 5 with the current one in the middle; with the first current, the window covers the
 * first items and the current one is its first. Dots, thumbnail strips, breadcrumbs and any "a few around here"
 * display can draw the answer without redoing the edge cases.
 */
export function slidingWindowOf(count: number, index: number, size: number): SlidingWindow {
  const total = Math.max(0, wholeOf(count, 0));
  if (total === 0) return { start: 0, size: 0, current: 0, offset: 0, hasBefore: false, hasAfter: false };
  const covered = Math.min(total, Math.max(1, wholeOf(size, 1)));
  const current = Math.min(total - 1, Math.max(0, wholeOf(index, 0)));
  const start = Math.min(total - covered, Math.max(0, current - Math.floor((covered - 1) / 2)));
  return {
    start,
    size: covered,
    current,
    offset: current - start,
    hasBefore: start > 0,
    hasAfter: start + covered < total,
  };
}
