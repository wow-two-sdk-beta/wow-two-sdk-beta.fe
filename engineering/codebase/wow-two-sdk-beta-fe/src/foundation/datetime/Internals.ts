// Private helpers shared across the datetime slice — deliberately absent from `index.ts` so the public
// surface stays exactly the documented operation set.
//
// Two invariants live here:
//  1. `cloneDate` is the ONLY producer of a result `Date`. Every public op clones first, then mutates the
//     clone — "never mutate the input" is then structural, not a review convention. A new op that reaches
//     for `new Date(...)` directly is the thing to catch in review.
//  2. `daysInMonth` uses the day-0 trick (day `0` of month N+1 = last day of month N) driven through
//     `setFullYear`, NOT the `new Date(year, month, day)` constructor — that constructor maps years 0-99
//     to 1900+year, which would silently mis-length February for a year-0-99 date. The probe starts at
//     local noon so a DST midnight-transition zone can't shift the probe onto an adjacent day.

/** Milliseconds in one second. */
export const MsPerSecond = 1000;

/** Milliseconds in one minute. */
export const MsPerMinute = 60_000;

/** Milliseconds in one hour. */
export const MsPerHour = 3_600_000;

/** Milliseconds in one 24-hour period (nominal — a DST day is 23 or 25 hours). */
export const MsPerDay = 86_400_000;

/** Copies a `Date` by timestamp. An invalid input yields an equally-invalid copy (`NaN` time). */
export function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

/** Returns the length in days of `monthIndex` (0-11) in `year`, leap years included. */
export function daysInMonth(year: number, monthIndex: number): number {
  const probe = new Date(2000, 0, 1, 12);
  probe.setFullYear(year, monthIndex + 1, 0);
  return probe.getDate();
}
