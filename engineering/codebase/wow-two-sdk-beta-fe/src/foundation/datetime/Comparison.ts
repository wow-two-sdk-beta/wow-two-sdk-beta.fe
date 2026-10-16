// Date comparison + selection. Predicates return `boolean`; selectors (`minDate`/`maxDate`/`clampDate`)
// return a NEW `Date` and never mutate an input.
//
// NOW IS ALWAYS INJECTABLE. `isToday`/`isPast`/`isFuture` take `now` as their last parameter, defaulting
// to `new Date()` in the SIGNATURE — never buried in the body. A test passes a fixed `now` and the result
// is deterministic; a caller that omits it gets the obvious behavior. Any future now-dependent predicate
// added here must follow the same shape, otherwise the test for it can only be flaky or clock-mocked.
//
// Two slice-wide rules encoded here:
//  - An invalid `Date` makes every predicate `false` (a `NaN` timestamp compares false against
//    everything, including itself). No predicate throws — callers filter with `isValidDate`.
//  - A REVERSED range (`start` after `end`) is EMPTY, not auto-normalized: `isBetween` returns `false`.
//    Silently swapping the bounds would hide a caller bug behind a plausible answer, and the same rule
//    holds in `Interval.ts` so the whole slice reads one way.

import { startOfWeek, type WeekStartsOn } from './Boundaries';
import { cloneDate } from './Internals';
import { isValidDate } from './IsoDate';

/** Tunes whether a range test counts its bounds. */
export interface BetweenOptions {
  /** Count `start`/`end` themselves as inside the range. Defaults to `true`. */
  readonly inclusive?: boolean;
}

/** True when both dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * True when both dates fall in the same week. `weekStartsOn` defaults to `1` (Monday, ISO-8601) and
 * must match the value used elsewhere in the same calendar — Dec 31 and Jan 1 can share a week.
 */
export function isSameWeek(a: Date, b: Date, weekStartsOn: WeekStartsOn = 1): boolean {
  return startOfWeek(a, weekStartsOn).getTime() === startOfWeek(b, weekStartsOn).getTime();
}

/** True when both dates fall in the same month of the same year. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** True when both dates fall in the same calendar year. */
export function isSameYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear();
}

/** True when `date` is strictly earlier than `other` (millisecond precision). */
export function isBefore(date: Date, other: Date): boolean {
  return date.getTime() < other.getTime();
}

/** True when `date` is strictly later than `other` (millisecond precision). */
export function isAfter(date: Date, other: Date): boolean {
  return date.getTime() > other.getTime();
}

/**
 * True when `date` falls in `[start, end]` — bounds included by default, excluded with
 * `{ inclusive: false }`. Returns `false` for a reversed range (`start` after `end`) and for any
 * invalid input; the bounds are never swapped for you.
 */
export function isBetween(date: Date, start: Date, end: Date, options?: BetweenOptions): boolean {
  const value = date.getTime();
  const from = start.getTime();
  const to = end.getTime();
  if (Number.isNaN(value) || Number.isNaN(from) || Number.isNaN(to)) return false;
  if (from > to) return false;
  return options?.inclusive === false ? value > from && value < to : value >= from && value <= to;
}

/** True when `date` falls on the same local day as `now` (defaults to the current clock; inject for tests). */
export function isToday(date: Date, now: Date = new Date()): boolean {
  return isSameDay(date, now);
}

/** True when `date` is strictly before `now` (defaults to the current clock; inject for tests). */
export function isPast(date: Date, now: Date = new Date()): boolean {
  return isBefore(date, now);
}

/** True when `date` is strictly after `now` (defaults to the current clock; inject for tests). */
export function isFuture(date: Date, now: Date = new Date()): boolean {
  return isAfter(date, now);
}

// Shared scan for `minDate`/`maxDate`. Invalid dates are skipped so one bad entry can't win by way of a
// `NaN` comparison; if every input is invalid the (invalid) first one is returned so the arity contract
// — "at least one date in, exactly one date out" — never degrades into `null`.
function select(first: Date, rest: ReadonlyArray<Date>, keep: (candidate: number, best: number) => boolean): Date {
  const candidates = [first, ...rest].filter(isValidDate);
  let best = candidates.at(0) ?? first;
  for (const candidate of candidates) {
    if (keep(candidate.getTime(), best.getTime())) best = candidate;
  }
  return cloneDate(best);
}

/** Returns a copy of the earliest of the given dates. Invalid dates are ignored unless all of them are. */
export function minDate(first: Date, ...rest: ReadonlyArray<Date>): Date {
  return select(first, rest, (candidate, best) => candidate < best);
}

/** Returns a copy of the latest of the given dates. Invalid dates are ignored unless all of them are. */
export function maxDate(first: Date, ...rest: ReadonlyArray<Date>): Date {
  return select(first, rest, (candidate, best) => candidate > best);
}

/**
 * Returns a copy of `date` pulled inside `[min, max]`. Either bound may be omitted or `null` to leave
 * that side open. Bounds are applied low-then-high, so a caller-inverted pair (`min` after `max`)
 * resolves to `max`.
 */
export function clampDate(date: Date, min?: Date | null, max?: Date | null): Date {
  let result = date;
  if (min != null && isBefore(result, min)) result = min;
  if (max != null && isAfter(result, max)) result = max;
  return cloneDate(result);
}
