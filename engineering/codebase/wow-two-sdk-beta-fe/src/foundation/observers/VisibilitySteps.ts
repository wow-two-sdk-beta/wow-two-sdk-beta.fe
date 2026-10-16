// The one piece of arithmetic in this slice, kept pure and DOM-free so it is testable in node — same split the
// gestures slice makes between `GestureMath` and its composables.
//
// WHY A THRESHOLD LADDER AT ALL: `IntersectionObserver` does not stream a continuous ratio. It fires only when a
// listed threshold is CROSSED, so an observer built with `threshold: 0` reports `intersectionRatio` exactly twice
// per pass — on the way in and on the way out — and a consumer polling that value for a progress bar sees it
// jump 0 → 1. Sampling a percentage means asking for the samples up front. `useVisibility` exists to hide that.
//
// STEPS ARE CAPPED, AND THE CAP IS THE POINT. Each threshold is a wake-up: the browser recomputes intersection
// and dispatches a callback that can wake every watcher on the value. `steps: 1000` is not a smoother read, it is
// a thousand updates per scroll-through for a number a human sees three digits of. 100 is already finer than any
// UI needs.
//
// ROUNDING IS NOT COSMETIC. `3 / 15` is `0.19999999999999998`; a ladder built from raw division carries float
// noise into the DOM and makes two ladders that should be equal compare unequal in the composables' option signature.
// Rounding to 4 decimals is far below any threshold the browser can distinguish and makes the output stable.

/** Fewest steps that still describes a range — `[0, 1]`, i.e. "empty or full". */
const MinSteps = 1;

/** Most steps allowed; see the header — beyond this the ladder costs more than the precision is worth. */
const MaxSteps = 100;

/** Decimal places each threshold is rounded to, killing float noise well below observer precision. */
const DecimalPlaces = 4;

/**
 * Builds an evenly spaced threshold ladder for `IntersectionObserver`.
 *
 * Always includes both `0` and `1`, so a consumer is told when the element leaves entirely and when it is fully
 * visible regardless of how coarse the sampling is.
 *
 * `steps` is clamped to `1`–`100` and rounded to an integer; a `NaN`, an infinity, or a negative collapses to the
 * minimum rather than throwing, because a bad number here should degrade the resolution of a progress readout,
 * never break the page that renders it.
 *
 * @param steps How many intervals to divide `0`–`1` into. `steps: 4` ⇒ `[0, 0.25, 0.5, 0.75, 1]`.
 * @returns A frozen ascending ladder of `steps + 1` thresholds, first `0` and last `1`.
 */
export function visibilityThresholds(steps: number): ReadonlyArray<number> {
  const count = Number.isFinite(steps) ? Math.min(Math.max(Math.round(steps), MinSteps), MaxSteps) : MinSteps;

  const factor = 10 ** DecimalPlaces;
  const ladder: number[] = [];
  for (let index = 0; index <= count; index += 1) {
    ladder.push(Math.round((index / count) * factor) / factor);
  }
  return Object.freeze(ladder);
}
