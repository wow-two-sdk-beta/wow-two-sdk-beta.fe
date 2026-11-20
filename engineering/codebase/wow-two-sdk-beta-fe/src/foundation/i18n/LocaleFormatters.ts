import { computed, type ComputedRef } from 'vue';

import type { ExactNumber, NumberFailure } from '../numbers';
import type { Result } from '../results';
import {
  formatExactNumber,
  formatExactCurrency,
  formatExactPercent,
  type ExactNumberFormatOptions,
  type ExactCurrencyFormatOptions,
  type ExactPercentFormatOptions,
} from './ExactNumberFormatter';
import { formatMonthYear, monthName, weekdayName, type DateNameStyle, type YearMonthLike } from './DateNames';
import { formatRelativeTime } from './RelativeTimeFormatter';
import { useLocale } from './providers/LocaleContext';

import { intlOptionsKey as optKey, memoIntl as memo } from './IntlCache';

/** Locale-bound `Intl` formatters — the surface every embedded-text component formats through. */
export interface LocaleFormatters {
  /** The BCP-47 locale these formatters are bound to. */
  locale: string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  exactNumber(value: ExactNumber, options?: ExactNumberFormatOptions): Result<string, NumberFailure>;
  exactCurrency(
    value: ExactNumber,
    currency: string,
    options?: ExactCurrencyFormatOptions,
  ): Result<string, NumberFailure>;
  exactPercent(value: ExactNumber, options?: ExactPercentFormatOptions): Result<string, NumberFailure>;
  currency(value: number, currency: string, options?: Intl.NumberFormatOptions): string;
  percent(value: number, options?: Intl.NumberFormatOptions): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  time(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  /** Relative time ("3 days ago"); Uzbek reads correctly where the runtime has no Uzbek data — `formatRelativeTime`. */
  relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
  /** A month's name, 1-12 — `monthName`. */
  monthName(month: number, style?: DateNameStyle): string;
  /** A weekday's name by ISO number, Monday 1 to Sunday 7 — `weekdayName`. */
  weekdayName(isoDay: number, style?: DateNameStyle): string;
  /** A month and year as a title ("November 2026") — `formatMonthYear`. */
  monthYear(value: YearMonthLike): string;
  list(items: Iterable<string>, options?: Intl.ListFormatOptions): string;
  plural(value: number, options?: Intl.PluralRulesOptions): Intl.LDMLPluralRule;
}

/** Builds locale-bound formatters (pure — the testable core of `useLocaleFormatters`). */
export function createLocaleFormatters(locale: string): LocaleFormatters {
  const nf = (options?: Intl.NumberFormatOptions) =>
    memo(`n|${locale}|${optKey(options)}`, () => new Intl.NumberFormat(locale, options));
  const dtf = (options?: Intl.DateTimeFormatOptions) =>
    memo(`d|${locale}|${optKey(options)}`, () => new Intl.DateTimeFormat(locale, options));
  return {
    locale,
    number: (value, options) => nf(options).format(value),
    exactNumber: (value, options) => formatExactNumber(value, locale, options),
    exactCurrency: (value, currency, options) => formatExactCurrency(value, locale, currency, options),
    exactPercent: (value, options) => formatExactPercent(value, locale, options),
    currency: (value, currency, options) => nf({ ...options, style: 'currency', currency }).format(value),
    percent: (value, options) => nf({ ...options, style: 'percent' }).format(value),
    date: (value, options) => dtf(options ?? { dateStyle: 'medium' }).format(value),
    time: (value, options) => dtf(options ?? { timeStyle: 'short' }).format(value),
    relativeTime: (value, unit, options) => formatRelativeTime(value, unit, locale, options),
    monthName: (month, style) => monthName(month, locale, style),
    weekdayName: (isoDay, style) => weekdayName(isoDay, locale, style),
    monthYear: (value) => formatMonthYear(value, locale),
    list: (items, options) =>
      memo(`l|${locale}|${optKey(options)}`, () => new Intl.ListFormat(locale, options)).format(items),
    plural: (value, options) =>
      memo(`p|${locale}|${optKey(options)}`, () => new Intl.PluralRules(locale, options)).select(value),
  };
}

/**
 * Returns locale-bound `Intl` formatters — `number`/`currency`/`percent`/`date`/`time`/`relativeTime`/`list`/
 * `plural` — recomputed only when the active locale changes.
 *
 * A `ComputedRef` rather than a plain object: the locale is reactive, so the formatter set bound to it has to
 * be too. Read it as `formatters.value.number(1234)`.
 */
export function useLocaleFormatters(): ComputedRef<LocaleFormatters> {
  const { locale } = useLocale();
  return computed(() => createLocaleFormatters(locale.value));
}
