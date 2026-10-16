// Signed distance between two dates, in whole units.
//
// ARGUMENT ORDER is `(from, to)` and the result is POSITIVE when `to` is later — the same order the
// existing `daysBetween`/`minutesBetween` helpers in `presentation/forms/DateExtensions` already use.
// Note this is the REVERSE of `date-fns`, whose `differenceInDays(dateLeft, dateRight)` computes
// left − right; the parameter names are the reminder.
//
// TRUNCATION, never rounding: a partial trailing unit does not count, and truncation is toward zero, so
// `differenceInX(a, b) === -differenceInX(b, a)` holds for every unit. 25 hours apart = 1 day; 23 hours
// apart = 0 days. The one exception is internal: the day/week calculation rounds the raw millisecond
// quotient because a DST day is 23 or 25 hours long and would otherwise truncate to a day short — both
// endpoints are snapped to local start-of-day first, so what is being rounded is a whole-day quantity
// that only DST perturbed. That makes day differences CALENDAR-day differences: Mar 15 23:00 → Mar 16
// 01:00 is 1 day apart, not 0, which is what a calendar UI means by "1 day".
//
// Month/year differences are calendar-based and agree with `addMonths` clamping: Jan 31 → Feb 28 is a
// full 1 month, because `addMonths(Jan 31, 1)` lands exactly on Feb 28.

import { addMonths } from './Arithmetic';
import { startOfDay } from './Boundaries';
import { MsPerDay, MsPerHour, MsPerMinute, MsPerSecond } from './Internals';

/** Signed whole SECONDS from `from` to `to`, truncated toward zero. Positive when `to` is later. */
export function differenceInSeconds(from: Date, to: Date): number {
  return Math.trunc((to.getTime() - from.getTime()) / MsPerSecond);
}

/** Signed whole MINUTES from `from` to `to`, truncated toward zero. Positive when `to` is later. */
export function differenceInMinutes(from: Date, to: Date): number {
  return Math.trunc((to.getTime() - from.getTime()) / MsPerMinute);
}

/** Signed whole HOURS of elapsed time from `from` to `to`, truncated toward zero. Positive when `to` is later. */
export function differenceInHours(from: Date, to: Date): number {
  return Math.trunc((to.getTime() - from.getTime()) / MsPerHour);
}

/**
 * Signed CALENDAR days from `from` to `to`. Both endpoints are snapped to local start-of-day first, so
 * the result counts date boundaries crossed rather than 24-hour blocks, and a DST transition never
 * produces an off-by-one. Positive when `to` is later.
 */
export function differenceInDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MsPerDay);
}

/**
 * Signed whole WEEKS from `from` to `to`, derived from {@link differenceInDays} and truncated toward
 * zero — 13 calendar days apart is 1 week. Positive when `to` is later.
 */
export function differenceInWeeks(from: Date, to: Date): number {
  return Math.trunc(differenceInDays(from, to) / 7);
}

/**
 * Signed whole calendar MONTHS from `from` to `to`, truncated toward zero — a partial trailing month is
 * dropped, so Jan 15 → Feb 14 is 0. Agrees with `addMonths` clamping (Jan 31 → Feb 28 is 1). Positive
 * when `to` is later.
 */
export function differenceInMonths(from: Date, to: Date): number {
  const target = to.getTime();
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (Number.isNaN(months) || Number.isNaN(target)) return NaN;

  // The field arithmetic above overshoots whenever the day-of-month (or time-of-day) hasn't been
  // reached yet; step back one month in that case so the count is whole units only.
  if (months > 0 && addMonths(from, months).getTime() > target) months -= 1;
  else if (months < 0 && addMonths(from, months).getTime() < target) months += 1;
  return months;
}

/**
 * Signed whole calendar YEARS from `from` to `to`, derived from {@link differenceInMonths} and truncated
 * toward zero — the usual "age in years" calculation. Positive when `to` is later.
 */
export function differenceInYears(from: Date, to: Date): number {
  return Math.trunc(differenceInMonths(from, to) / 12);
}
