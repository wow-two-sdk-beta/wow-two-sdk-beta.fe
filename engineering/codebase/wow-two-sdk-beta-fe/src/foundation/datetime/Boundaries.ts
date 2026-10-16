// Period boundaries — snapping a `Date` to the first/last instant of its day, week, month, or year.
// Every op returns a NEW `Date`; the input is never mutated.
//
// All boundaries are LOCAL wall-clock, matching how a user reads a calendar: "today" ends at local
// 23:59:59.999, not at UTC midnight. End-of-period is the last representable millisecond (…:59.999)
// rather than the next period's start, so a closed `[start, end]` range covers the period exactly and
// `isWithinInterval` needs no half-open special case.
//
// `startOfWeek` takes `weekStartsOn` because the first day of the week is locale-dependent and NOT
// derivable from the `Date` itself. The default is 1 (Monday) = ISO-8601, which is also what the
// majority of locales use; a US/CA/JP calendar passes 0 (Sunday). There is no "detect it from the
// locale" path here on purpose — `Intl` exposes no stable week-start API across engines, so guessing
// would be worse than an explicit argument. Locale-aware DISPLAY stays in `foundation/i18n`.
//
// DST note: in the handful of zones whose DST transition happens AT midnight (e.g. America/Santiago),
// local 00:00 does not exist on transition day and `setHours(0, …)` yields 01:00. That is the correct
// "first instant of the day" in that zone — the guarantee is first-instant, not literally 00:00.

import { addDays, subDays } from './Arithmetic';
import { cloneDate } from './Internals';

/** Day index a week starts on: `0` Sunday … `6` Saturday. */
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Returns the first instant of `date`'s local day (00:00:00.000). */
export function startOfDay(date: Date): Date {
  const result = cloneDate(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Returns the last instant of `date`'s local day (23:59:59.999). */
export function endOfDay(date: Date): Date {
  const result = cloneDate(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Returns the first instant of `date`'s week. `weekStartsOn` defaults to `1` (Monday, ISO-8601);
 * pass `0` for a Sunday-first (US) calendar.
 */
export function startOfWeek(date: Date, weekStartsOn: WeekStartsOn = 1): Date {
  const offset = (date.getDay() - weekStartsOn + 7) % 7;
  return startOfDay(subDays(date, offset));
}

/**
 * Returns the last instant of `date`'s week (day 7 at 23:59:59.999). `weekStartsOn` defaults to `1`
 * (Monday, ISO-8601); pass `0` for a Sunday-first (US) calendar.
 */
export function endOfWeek(date: Date, weekStartsOn: WeekStartsOn = 1): Date {
  return endOfDay(addDays(startOfWeek(date, weekStartsOn), 6));
}

/** Returns the first instant of the 1st of `date`'s month. */
export function startOfMonth(date: Date): Date {
  const result = cloneDate(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Returns the last instant of the last day of `date`'s month (28th-31st at 23:59:59.999). */
export function endOfMonth(date: Date): Date {
  const result = cloneDate(date);
  // Day `0` of the NEXT month is the last day of this one — avoids a `daysInMonth` lookup and the
  // day-overflow that `setMonth(getMonth() + 1)` alone would cause on a 31st.
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/** Returns the first instant of Jan 1 of `date`'s year. */
export function startOfYear(date: Date): Date {
  const result = cloneDate(date);
  result.setMonth(0, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Returns the last instant of Dec 31 of `date`'s year. */
export function endOfYear(date: Date): Date {
  const result = cloneDate(date);
  result.setMonth(11, 31);
  result.setHours(23, 59, 59, 999);
  return result;
}
