import { intlOptionsKey, memoIntl } from './IntlCache';
import { localeTableFor } from './LocaleTables';

/** How long a month or weekday name is: `November` · `Nov` · `N`. */
export type DateNameStyle = 'long' | 'short' | 'narrow';

/** Anything that carries a calendar year and a 1-12 month: a `Temporal.PlainDate`, a `Temporal.PlainYearMonth`. */
export interface YearMonthLike {
  readonly year: number;
  readonly month: number;
}

/* A November, and a Wednesday: names no language the SDK carries a table for spells like English. */
const ProbeMonth = Date.UTC(2026, 10, 15);
const ProbeWeekday = Date.UTC(2024, 0, 3);

/* The root locale spells months "M11" when a runtime has no data for a language; a bare number is the same gap. */
const RootMonth = /^M?\d+$/;

/** Formats through a cached `Intl.DateTimeFormat`, pinned to UTC so no time zone shifts the calendar day. */
function format(locale: string, options: Intl.DateTimeFormatOptions, instant: number): string {
  return memoIntl(
    `dn|${locale}|${intlOptionsKey(options)}`,
    () => new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }),
  ).format(instant);
}

/* A name that matches English's in a locale that is not English is the runtime falling back to English. */
function spelledAsEnglish(locale: string, options: Intl.DateTimeFormatOptions, instant: number): boolean {
  return format(locale, options, instant) === format('en', options, instant);
}

/** True when the runtime has no month names for `locale`: the root "M11", or English words. Probed once per locale. */
function lacksMonths(locale: string): boolean {
  return memoIntl(`dnm|${locale}`, () =>
    (['long', 'short'] as const).some(
      (month) =>
        RootMonth.test(format(locale, { month }, ProbeMonth)) || spelledAsEnglish(locale, { month }, ProbeMonth),
    ),
  );
}

/** True when the runtime has no weekday names for `locale`: it answers with English. Probed once per locale. */
function lacksWeekdays(locale: string): boolean {
  return memoIntl(`dnw|${locale}`, () =>
    (['long', 'short'] as const).some((weekday) => spelledAsEnglish(locale, { weekday }, ProbeWeekday)),
  );
}

/* The first letter, capitalised — the narrow form of a table name (`dushanba` → `D`). */
function initial(name: string): string {
  return (Array.from(name)[0] ?? '').toUpperCase();
}

/* One name from a table's long and short lists; narrow is the long name's first letter. */
function tableName(
  names: { readonly long: readonly string[]; readonly short: readonly string[] },
  style: DateNameStyle,
  index: number,
): string {
  return style === 'narrow' ? initial(names.long[index] ?? '') : (names[style][index] ?? '');
}

function assertMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new RangeError('month must be an integer from 1 to 12');
}

/**
 * The name of a month for `locale`: `monthName(11, 'en')` is `November`, and `monthName(11, 'uz')` is `noyabr`
 * even where the runtime has no Uzbek data. `month` is 1-12, January first; anything else throws a `RangeError`.
 */
export function monthName(month: number, locale: string, style: DateNameStyle = 'long'): string {
  assertMonth(month);
  const table = localeTableFor(locale);
  if (table !== undefined && lacksMonths(locale)) {
    return tableName(table.months, style, month - 1);
  }
  return format(locale, { month: style }, Date.UTC(2026, month - 1, 15));
}

/**
 * The name of a weekday for `locale`, by ISO 8601 number: `weekdayName(1, 'en')` is `Monday`, `7` is Sunday.
 * Uzbek gets the SDK's names where the runtime has none. Throws a `RangeError` outside 1-7.
 */
export function weekdayName(isoDay: number, locale: string, style: DateNameStyle = 'long'): string {
  if (!Number.isInteger(isoDay) || isoDay < 1 || isoDay > 7)
    throw new RangeError('isoDay must be an integer from 1 to 7');
  const table = localeTableFor(locale);
  if (table !== undefined && lacksWeekdays(locale)) {
    return tableName(table.weekdays, style, isoDay - 1);
  }
  // 1 January 2024 is a Monday, so the ISO day number is the day of that month.
  return format(locale, { weekday: style }, Date.UTC(2024, 0, isoDay));
}

/**
 * A month and its year as a calendar title: `November 2026`, `ноябрь 2026 г.` (ru, as `Intl` writes it), and
 * `noyabr 2026` in Uzbek where the runtime has no Uzbek data. Takes a `Temporal.PlainDate`,
 * a `Temporal.PlainYearMonth` or any `{ year, month }`.
 */
export function formatMonthYear(value: YearMonthLike, locale: string): string {
  assertMonth(value.month);
  const table = localeTableFor(locale);
  if (table !== undefined && lacksMonths(locale)) return `${monthName(value.month, locale, 'long')} ${value.year}`;
  // `setUTCFullYear` keeps years below 100 from landing in 1900-1999, which `Date.UTC` would do.
  const instant = new Date(0);
  instant.setUTCFullYear(value.year, value.month - 1, 1);
  return format(locale, { month: 'long', year: 'numeric' }, instant.getTime());
}
