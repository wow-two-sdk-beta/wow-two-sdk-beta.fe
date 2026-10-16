// Shared date helpers for CalendarPicker / DatePicker / DateInput / RangeCalendarPicker.
// Co-located in `forms/` so imports stay within-domain.
//
// Temporal-based — the ecosystem standardizes on the Temporal API (dates =
// `Temporal.*`). `Temporal.PlainDate` carries calendar math (no timezone), so
// these helpers are inherently local/wall-clock, which is what calendar UIs want.
// `Temporal.PlainTime` carries hour/minute for the time components.

import { Temporal } from 'temporal-polyfill';

export const WeekdayLabelsShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const MonthLabelsLong = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Sunday-anchored column index (0 = Sun … 6 = Sat) for a PlainDate. */
export function sundayIndex(d: Temporal.PlainDate): number {
  // Temporal `dayOfWeek` is 1 (Mon) … 7 (Sun); map Sunday to 0 for our Su-first grid.
  return d.dayOfWeek % 7;
}

/** Today as a PlainDate in the local time zone. */
export function today(): Temporal.PlainDate {
  return Temporal.Now.plainDateISO();
}

export function isSameDay(a: Temporal.PlainDate | null | undefined, b: Temporal.PlainDate | null | undefined): boolean {
  if (!a || !b) return false;
  return a.equals(b);
}

export function isToday(d: Temporal.PlainDate): boolean {
  return d.equals(today());
}

/** Add `n` months; Temporal clamps to the target month's last day (Jan 31 +1 → Feb 28). */
export function addMonths(d: Temporal.PlainDate, n: number): Temporal.PlainDate {
  return d.add({ months: n });
}

export function addDays(d: Temporal.PlainDate, n: number): Temporal.PlainDate {
  return d.add({ days: n });
}

/** First day of `d`'s month. */
export function startOfMonth(d: Temporal.PlainDate): Temporal.PlainDate {
  return d.with({ day: 1 });
}

/** Number of days in the given year/month (1-indexed month). */
export function daysInMonth(year: number, month: number): number {
  return Temporal.PlainDate.from({ year, month, day: 1 }).daysInMonth;
}

/**
 * Build the 6-week (42-cell) grid that the calendar UI renders.
 * `year`/`month` are 1-indexed (Temporal convention). Cells outside the target
 * month carry `outOfMonth: true`.
 */
export function buildMonthGrid(
  year: number,
  month: number,
): ReadonlyArray<{ date: Temporal.PlainDate; outOfMonth: boolean }> {
  const first = Temporal.PlainDate.from({ year, month, day: 1 });
  const start = first.subtract({ days: sundayIndex(first) });
  const cells: { date: Temporal.PlainDate; outOfMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = start.add({ days: i });
    cells.push({ date, outOfMonth: date.month !== month });
  }
  return cells;
}

/** Format PlainDate → "YYYY-MM-DD" for a native `<input type="date">` value. */
export function formatISODate(d: Temporal.PlainDate | null | undefined): string {
  if (!d) return '';
  return d.toString();
}

/** Parse "YYYY-MM-DD" → PlainDate. Returns null for invalid input. */
export function parseISODate(s: string | null | undefined): Temporal.PlainDate | null {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  try {
    return Temporal.PlainDate.from(s, { overflow: 'reject' });
  } catch {
    return null;
  }
}

/** Format PlainTime → "HH:MM" for a native `<input type="time">` value. */
export function formatISOTime(t: Temporal.PlainTime | null | undefined): string {
  if (!t) return '';
  return t.toString({ smallestUnit: 'minute' });
}

/** Parse "HH:MM" → PlainTime. Returns null for invalid input. */
export function parseISOTime(s: string | null | undefined): Temporal.PlainTime | null {
  if (!s) return null;
  if (!/^\d{2}:\d{2}$/.test(s)) return null;
  try {
    return Temporal.PlainTime.from(s, { overflow: 'reject' });
  } catch {
    return null;
  }
}

/** Format PlainDateTime → "YYYY-MM-DDTHH:MM" for a native `<input type="datetime-local">` value. */
export function formatISODateTime(dt: Temporal.PlainDateTime | null | undefined): string {
  if (!dt) return '';
  return dt.toString({ smallestUnit: 'minute' });
}

/** Parse "YYYY-MM-DDTHH:MM" (seconds optional) → PlainDateTime. Returns null for invalid input. */
export function parseISODateTime(s: string | null | undefined): Temporal.PlainDateTime | null {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) return null;
  try {
    return Temporal.PlainDateTime.from(s, { overflow: 'reject' });
  } catch {
    return null;
  }
}

export function clampDate(
  d: Temporal.PlainDate,
  min?: Temporal.PlainDate | null,
  max?: Temporal.PlainDate | null,
): Temporal.PlainDate {
  if (min && Temporal.PlainDate.compare(d, min) < 0) return min;
  if (max && Temporal.PlainDate.compare(d, max) > 0) return max;
  return d;
}

export function isDateDisabled(
  d: Temporal.PlainDate,
  options: {
    min?: Temporal.PlainDate | null;
    max?: Temporal.PlainDate | null;
    isDisabled?: (d: Temporal.PlainDate) => boolean;
  },
): boolean {
  const { min, max, isDisabled } = options;
  if (min && Temporal.PlainDate.compare(d, min) < 0) return true;
  if (max && Temporal.PlainDate.compare(d, max) > 0) return true;
  if (isDisabled?.(d)) return true;
  return false;
}

export function isInRange(
  d: Temporal.PlainDate,
  start: Temporal.PlainDate | null | undefined,
  end: Temporal.PlainDate | null | undefined,
): boolean {
  if (!start || !end) return false;
  const lo = Temporal.PlainDate.compare(start, end) <= 0 ? start : end;
  const hi = Temporal.PlainDate.compare(start, end) <= 0 ? end : start;
  return Temporal.PlainDate.compare(d, lo) >= 0 && Temporal.PlainDate.compare(d, hi) <= 0;
}

/** Signed whole-day count from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: Temporal.PlainDate, b: Temporal.PlainDate): number {
  return a.until(b, { largestUnit: 'day' }).days;
}

/** True when `d` falls on a Saturday or Sunday. */
export function isWeekend(d: Temporal.PlainDate): boolean {
  // Temporal `dayOfWeek`: 1 (Mon) … 7 (Sun); 6 = Sat, 7 = Sun.
  return d.dayOfWeek === 6 || d.dayOfWeek === 7;
}

// ── Datetime helpers (ZonedDateTime) ──────────────────────────────────────
// EventCalendarViewer / ScheduleView model absolute instants (a wall-clock time in a
// specific zone) — the `Temporal.ZonedDateTime` peer of .NET `DateTimeOffset`.
// The grid + navigation still project down to `Temporal.PlainDate` (via the
// helpers above); these cover the intra-day time-slot math the grid needs.

/** Now as a ZonedDateTime in the local (system) time zone. */
export function nowZoned(): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO();
}

/** The calendar day a ZonedDateTime falls on (its wall-clock PlainDate). */
export function zonedToPlainDate(z: Temporal.ZonedDateTime): Temporal.PlainDate {
  return z.toPlainDate();
}

/** True when two ZonedDateTimes land on the same wall-clock day (same zone assumed). */
export function isSameZonedDay(a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime): boolean {
  return a.toPlainDate().equals(b.toPlainDate());
}

/** True when a ZonedDateTime falls on `day` (its wall-clock date equals `day`). */
export function isZonedOnDay(z: Temporal.ZonedDateTime, day: Temporal.PlainDate): boolean {
  return z.toPlainDate().equals(day);
}

/** Start-of-day (00:00, zone-correct) for `day` in `z`'s time zone. */
export function startOfZonedDay(day: Temporal.PlainDate, timeZone: Temporal.TimeZoneLike): Temporal.ZonedDateTime {
  return day.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from('00:00') });
}

/** `day` at hour `hour` (minutes/seconds zeroed), zone-correct, in `timeZone`. */
export function zonedAtHour(
  day: Temporal.PlainDate,
  hour: number,
  timeZone: Temporal.TimeZoneLike,
): Temporal.ZonedDateTime {
  return day.toZonedDateTime({
    timeZone,
    plainTime: new Temporal.PlainTime(hour),
  });
}

/** Signed minutes from `a` to `b` (positive when `b` is later). */
export function minutesBetween(a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime): number {
  return a.until(b, { largestUnit: 'minute', smallestUnit: 'minute' }).minutes;
}

/** Later of two instants. */
export function maxZoned(a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
  return Temporal.ZonedDateTime.compare(a, b) >= 0 ? a : b;
}

/** Earlier of two instants. */
export function minZoned(a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
  return Temporal.ZonedDateTime.compare(a, b) <= 0 ? a : b;
}

/** True when `z`'s calendar day lies within [start, end] (inclusive, by day). */
export function isZonedDayInRange(
  z: Temporal.ZonedDateTime,
  start: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime,
): boolean {
  return isInRange(z.toPlainDate(), start.toPlainDate(), end.toPlainDate());
}

/** Format a ZonedDateTime's time-of-day as "HH:MM" (locale-aware). */
export function formatZonedTime(z: Temporal.ZonedDateTime, locale?: string): string {
  return z.toLocaleString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Validates an offered minute interval without unbounded loops or fractional Temporal values. */
export function normalizeMinuteStep(step: number | undefined): number {
  return step !== undefined && Number.isInteger(step) && step >= 1 && step <= 60 ? step : 5;
}

/** Inclusive same-day bounds. A reversed interval has no valid values. */
export function isTimeInBounds(
  value: Temporal.PlainTime,
  min?: Temporal.PlainTime | null,
  max?: Temporal.PlainTime | null,
): boolean {
  return (!min || Temporal.PlainTime.compare(value, min) >= 0) && (!max || Temporal.PlainTime.compare(value, max) <= 0);
}

export function clampTime(
  value: Temporal.PlainTime,
  min?: Temporal.PlainTime | null,
  max?: Temporal.PlainTime | null,
): Temporal.PlainTime {
  if (min && Temporal.PlainTime.compare(value, min) < 0) return min;
  if (max && Temporal.PlainTime.compare(value, max) > 0) return max;
  return value;
}

export function isDateTimeInBounds(
  value: Temporal.PlainDateTime,
  min?: Temporal.PlainDateTime | null,
  max?: Temporal.PlainDateTime | null,
): boolean {
  return (
    (!min || Temporal.PlainDateTime.compare(value, min) >= 0) &&
    (!max || Temporal.PlainDateTime.compare(value, max) <= 0)
  );
}

export function clampDateTime(
  value: Temporal.PlainDateTime,
  min?: Temporal.PlainDateTime | null,
  max?: Temporal.PlainDateTime | null,
): Temporal.PlainDateTime {
  if (min && Temporal.PlainDateTime.compare(value, min) < 0) return min;
  if (max && Temporal.PlainDateTime.compare(value, max) > 0) return max;
  return value;
}
