import type { Temporal } from 'temporal-polyfill';
import { createLocaleFormatters, monthName, weekdayName } from '../../../foundation/i18n';

/*
 * Calendar titles and labels name a month and a weekday through the SDK's date names, so a runtime with no data
 * for the locale (Chrome has no Uzbek) still reads "noyabr", not "M11". The date's pattern stays `Intl`'s: word
 * order, separators and numerals are the locale's, and only the month and weekday words are ever swapped.
 */

/** A calendar day as an instant at UTC midnight — a day carries no zone, so `Intl` is pinned to UTC. */
function utcMillis(day: Temporal.PlainDate): number {
  return day.toZonedDateTime('UTC').epochMilliseconds;
}

/* Swaps the runtime's word for the SDK's where they differ. The SDK answers with the runtime's own standalone name
   wherever the runtime has data, so a difference means the runtime had none and `text` carries its stand-in. Only
   long and short names are swapped; a one-letter name is too short to find in a formatted date. */
function swapName(text: string, runtime: string, sdk: string): string {
  return runtime === sdk || !text.includes(runtime) ? text : text.replace(runtime, () => sdk);
}

const isSwappable = (style: Intl.DateTimeFormatOptions['month']): style is 'long' | 'short' =>
  style === 'long' || style === 'short';

/**
 * `day` written as `Intl` does for `locale`, with its month and weekday words from `monthName` and `weekdayName`
 * where the runtime has none. `options` is what `toLocaleString` takes, without a `timeZone`.
 */
export function formatDay(day: Temporal.PlainDate, locale: string, options: Intl.DateTimeFormatOptions): string {
  const formatters = createLocaleFormatters(locale);
  const instant = utcMillis(day);
  const date = (extra: Intl.DateTimeFormatOptions): string => formatters.date(instant, { ...extra, timeZone: 'UTC' });
  let text = date(options);
  const { month, weekday } = options;
  if (isSwappable(month)) text = swapName(text, date({ month }), monthName(day.month, locale, month));
  if (isSwappable(weekday)) text = swapName(text, date({ weekday }), weekdayName(day.dayOfWeek, locale, weekday));
  return text;
}
