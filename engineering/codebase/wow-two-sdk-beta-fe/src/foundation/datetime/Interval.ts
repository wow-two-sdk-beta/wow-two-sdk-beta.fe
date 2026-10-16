// Date ranges — the primitives a calendar grid, a range picker, and a scheduling view are built from.
//
// A REVERSED range is EMPTY across this whole slice (same rule as `isBetween`): `eachDayOfInterval`
// returns `[]`, `isWithinInterval` and `overlaps` return `false`. The bounds are never swapped for you —
// a reversed range is a caller bug, and normalizing it would return a plausible answer that hides it.
// Invalid dates behave the same way, so neither function can spin: the loop guard compares against `NaN`
// and exits immediately.
//
// The two membership tests use DIFFERENT bound semantics on purpose, because they answer different
// questions:
//  - `isWithinInterval` is a POINT-in-range test → bounds INCLUSIVE. "Is this day inside the selected
//    range" must count the first and last day of the selection.
//  - `overlaps` is an INTERVAL-vs-INTERVAL test → bounds HALF-OPEN `[start, end)` by default. Two
//    back-to-back meetings (09:00-10:00 and 10:00-11:00) do not conflict, which is the answer every
//    scheduler wants. Pass `{ inclusive: true }` for closed-range semantics, where a shared endpoint
//    does count as an overlap.

import { addDays } from './Arithmetic';
import { startOfDay } from './Boundaries';
import { isBetween } from './Comparison';

/** A date range with inclusive bounds. A reversed range (`start` after `end`) is treated as empty. */
export interface DateInterval {
  /** Lower bound of the range. */
  readonly start: Date;

  /** Upper bound of the range. */
  readonly end: Date;
}

/** Tunes whether an overlap test counts a shared endpoint. */
export interface OverlapOptions {
  /**
   * Treat both ranges as closed `[start, end]`, so ranges that merely touch at an endpoint count as
   * overlapping. Defaults to `false` (half-open `[start, end)` — touching ranges do not overlap).
   */
  readonly inclusive?: boolean;
}

/**
 * Returns one `Date` per calendar day from `start` to `end`, both ends INCLUSIVE, each snapped to local
 * start-of-day. Returns `[]` when the range is reversed or either bound is invalid.
 *
 * Day stepping is calendar-based (not `+24h`), so a DST transition inside the range neither duplicates
 * nor skips a day.
 */
export function eachDayOfInterval(start: Date, end: Date): Date[] {
  if (start.getTime() > end.getTime()) return [];
  const last = startOfDay(end).getTime();
  const days: Date[] = [];
  let cursor = startOfDay(start);

  while (cursor.getTime() <= last) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/**
 * True when `date` falls inside `interval`, bounds INCLUSIVE. Returns `false` for a reversed interval or
 * any invalid date. Compares at millisecond precision — pass day boundaries
 * (`startOfDay`/`endOfDay`) when a whole-day test is meant.
 */
export function isWithinInterval(date: Date, interval: DateInterval): boolean {
  return isBetween(date, interval.start, interval.end);
}

/**
 * True when ranges `a` and `b` share any time. Half-open by default, so ranges that only touch at an
 * endpoint do NOT overlap; pass `{ inclusive: true }` to count a shared endpoint as an overlap.
 * Returns `false` when either range is reversed or holds an invalid date.
 *
 * A zero-length range (`start` equal to `end`) never overlaps anything under the default half-open
 * semantics; it does under `{ inclusive: true }`.
 */
export function overlaps(a: DateInterval, b: DateInterval, options?: OverlapOptions): boolean {
  const aStart = a.start.getTime();
  const aEnd = a.end.getTime();
  const bStart = b.start.getTime();
  const bEnd = b.end.getTime();

  if (Number.isNaN(aStart) || Number.isNaN(aEnd) || Number.isNaN(bStart) || Number.isNaN(bEnd)) return false;
  if (aStart > aEnd || bStart > bEnd) return false;

  if (options?.inclusive === true) return aStart <= bEnd && bStart <= aEnd;

  // A zero-length range spans no time at all, so under half-open semantics it intersects nothing — the
  // bare `aStart < bEnd && bStart < aEnd` test would otherwise report an overlap for a degenerate range
  // that happens to sit strictly INSIDE the other, but not for one sitting on its boundary. Callers
  // asking "is this instant inside that range" want `isWithinInterval`, which is inclusive by design.
  if (aStart === aEnd || bStart === bEnd) return false;

  return aStart < bEnd && bStart < aEnd;
}
