// Date arithmetic — every op returns a NEW `Date`, the input is never mutated.
//
// Two families with deliberately different semantics; picking the wrong one is the usual source of
// off-by-one-hour bugs:
//
//  - CALENDAR ops (`addDays`/`addWeeks`/`addMonths`/`addYears`) go through `setDate`/`setMonth`, which
//    operate on local wall-clock fields. Adding 1 day across a DST boundary therefore keeps the wall-clock
//    time (09:00 → 09:00) even though only 23 or 25 hours elapsed. This is what a calendar UI wants.
//  - ELAPSED ops (`addHours`/`addMinutes`/`addSeconds`) add absolute milliseconds. Across a DST boundary
//    the wall-clock time shifts by the offset delta, because the request was "N hours later", not
//    "the same time N days on". This is what a timer/deadline wants.
//
// `addMonths` CLAMPS to the target month's last day: Jan 31 + 1 month = Feb 28 (Feb 29 in a leap year),
// never Mar 3. The naive `setMonth(getMonth() + 1)` overflows instead, which is the classic bug — the
// day-of-month is parked at 1 before the month shift and re-applied clamped afterwards to prevent it.
// `addYears` routes through `addMonths`, so Feb 29 + 1 year = Feb 28 by the same rule.

import { cloneDate, daysInMonth, MsPerHour, MsPerMinute, MsPerSecond } from './Internals';

/** Adds `amount` calendar days (may be negative); preserves wall-clock time across a DST boundary. */
export function addDays(date: Date, amount: number): Date {
  const result = cloneDate(date);
  result.setDate(result.getDate() + amount);
  return result;
}

/** Subtracts `amount` calendar days; preserves wall-clock time across a DST boundary. */
export function subDays(date: Date, amount: number): Date {
  return addDays(date, -amount);
}

/** Adds `amount` weeks (7 calendar days each); preserves wall-clock time across a DST boundary. */
export function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * 7);
}

/** Subtracts `amount` weeks (7 calendar days each). */
export function subWeeks(date: Date, amount: number): Date {
  return addDays(date, -amount * 7);
}

/**
 * Adds `amount` calendar months, clamping the day-of-month to the target month's length —
 * Jan 31 + 1 = Feb 28 (Feb 29 in a leap year), Mar 31 - 1 = Feb 28. Time-of-day is preserved.
 */
export function addMonths(date: Date, amount: number): Date {
  const result = cloneDate(date);
  const day = result.getDate();
  // Park on the 1st so the month shift can never overflow into the following month, then re-apply
  // the original day clamped to what the target month actually has.
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  result.setDate(Math.min(day, daysInMonth(result.getFullYear(), result.getMonth())));
  return result;
}

/** Subtracts `amount` calendar months, clamping the day-of-month to the target month's length. */
export function subMonths(date: Date, amount: number): Date {
  return addMonths(date, -amount);
}

/** Adds `amount` calendar years, clamping Feb 29 to Feb 28 when the target year isn't a leap year. */
export function addYears(date: Date, amount: number): Date {
  return addMonths(date, amount * 12);
}

/** Subtracts `amount` calendar years, clamping Feb 29 to Feb 28 when the target year isn't a leap year. */
export function subYears(date: Date, amount: number): Date {
  return addMonths(date, -amount * 12);
}

/** Adds `amount` hours of elapsed time; wall-clock time shifts across a DST boundary. */
export function addHours(date: Date, amount: number): Date {
  const result = cloneDate(date);
  result.setTime(result.getTime() + amount * MsPerHour);
  return result;
}

/** Subtracts `amount` hours of elapsed time; wall-clock time shifts across a DST boundary. */
export function subHours(date: Date, amount: number): Date {
  return addHours(date, -amount);
}

/** Adds `amount` minutes of elapsed time. */
export function addMinutes(date: Date, amount: number): Date {
  const result = cloneDate(date);
  result.setTime(result.getTime() + amount * MsPerMinute);
  return result;
}

/** Subtracts `amount` minutes of elapsed time. */
export function subMinutes(date: Date, amount: number): Date {
  return addMinutes(date, -amount);
}

/** Adds `amount` seconds of elapsed time. */
export function addSeconds(date: Date, amount: number): Date {
  const result = cloneDate(date);
  result.setTime(result.getTime() + amount * MsPerSecond);
  return result;
}

/** Subtracts `amount` seconds of elapsed time. */
export function subSeconds(date: Date, amount: number): Date {
  return addSeconds(date, -amount);
}
