// ISO-8601 parsing + serialization, and the validity guard the rest of the slice leans on.
//
// Two spec traps this file exists to neutralize:
//
//  1. `new Date('2026-03-15')` — a DATE-ONLY ISO string is parsed as UTC midnight per spec, while a
//     date-TIME string without an offset is parsed as local. So the same-looking input lands on a
//     different calendar day depending on which shape it had and which side of UTC the user sits on.
//     `parseIsoDate` reads a date-only string field-by-field into LOCAL midnight, which is what a
//     `<input type="date">` value means to the person who typed it.
//  2. `date.toISOString().slice(0, 10)` — serializes in UTC, so 2026-03-15 23:30 in New York comes back
//     as `2026-03-16`, and 2026-03-15 00:30 in Tokyo as `2026-03-14`. The day silently shifts, usually
//     only for users in a subset of timezones, which is why it survives review. `toIsoDateString` reads
//     the LOCAL fields instead and never touches UTC.
//
// Parsing is strict + anchored: only the two accepted shapes parse, everything else returns `null`. No
// `Invalid Date` is ever returned, so a `Date` that leaves this module is always safe to store in state.
// Date-time input uses an ISO `T` separator (no space). These are local Date utilities;
// declared API wire fields use TemporalCodecs and their separate validation contracts.

import { daysInMonth } from './Internals';

const DateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
const DateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,9})?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Narrows `value` to a usable `Date` — a `Date` instance whose time is not `NaN`. Use it before any
 * op in this slice when the input came from outside (props, storage, a hand-built `new Date(input)`).
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Parses an ISO-8601 `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm[:ss[.sss]][Z|±HH:mm]` string, returning `null`
 * for any other input — including a well-shaped but impossible date such as `2026-02-30`. Never returns
 * an `Invalid Date`.
 *
 * A date-only string resolves to LOCAL midnight (not UTC midnight, which is what `new Date(string)`
 * would give). A date-time string keeps standard semantics: with an offset it is that absolute instant,
 * without one it is local wall-clock.
 */
export function parseIsoDate(value: string): Date | null {
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (text === '') return null;

  const dateOnly = DateOnly.exec(text);
  if (dateOnly !== null) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);

    const result = new Date(2000, 0, 1, 12);
    // `setFullYear` rather than the `new Date(y, m, d)` constructor: that constructor maps years 0-99
    // to 1900+year. The probe starts at local noon so a midnight-DST zone can't shift the day.
    result.setFullYear(year, month - 1, day);
    result.setHours(0, 0, 0, 0);

    // Round-trip check — the setters normalize out-of-range fields (Feb 30 → Mar 2) instead of failing,
    // so comparing back is the only way to reject an impossible date.
    if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
      return null;
    }
    return result;
  }

  if (!DateTime.test(text)) return null;
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(5, 7));
  const day = Number(text.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month - 1)) return null;

  const parsed = new Date(text);
  return isValidDate(parsed) ? parsed : null;
}

/**
 * Serializes `date` to `YYYY-MM-DD` using its LOCAL calendar fields — the day never shifts by timezone
 * the way `toISOString().slice(0, 10)` does. Round-trips exactly with {@link parseIsoDate}.
 *
 * Throws a `RangeError` on an invalid `Date`, or on a year outside `0000`-`9999` (which ISO-8601 can
 * only express with the extended `±YYYYYY` form this function does not emit). Guard with
 * {@link isValidDate} when the input is untrusted.
 */
export function toIsoDateString(date: Date): string {
  if (!isValidDate(date)) {
    throw new RangeError('toIsoDateString: expected a valid Date, got an invalid one');
  }

  const year = date.getFullYear();
  if (year < 0 || year > 9999) {
    throw new RangeError(`toIsoDateString: year ${year} is outside the representable range 0000-9999`);
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(year).padStart(4, '0')}-${month}-${day}`;
}
