import { intlOptionsKey, memoIntl } from './IntlCache';
import { localeTableFor, type RelativePattern, type RelativeUnit } from './LocaleTables';

/* The root locale's wording when a runtime has no data for a language: "-4 h" in the past, "+4 h" ahead. */
const BarePast = /^[-−]\s*\d/;
const BareFuture = /^\+\s*\d/;

/**
 * True when the runtime's `Intl.RelativeTimeFormat` has no patterns for `locale` and answers with the root
 * fallback (`-1 d`, `+1 d`). Probed once per locale and cached with the other `Intl` instances.
 */
function lacksPatterns(locale: string): boolean {
  return memoIntl(`rp|${locale}`, () => {
    const probe = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'long' });
    return BarePast.test(probe.format(-1, 'day')) && BareFuture.test(probe.format(1, 'day'));
  });
}

/* `Intl` takes both spellings (`day`, `days`); the SDK tables are written for the singular. */
function singular(unit: Intl.RelativeTimeFormatUnit): RelativeUnit {
  return unit.replace(/s$/, '') as RelativeUnit;
}

function fromPattern(
  pattern: RelativePattern | undefined,
  value: number,
  locale: string,
  numeric: 'always' | 'auto',
): string | undefined {
  if (pattern === undefined || !Number.isFinite(value)) return undefined;
  if (numeric === 'auto') {
    const word =
      value === 0 ? pattern.current : value === -1 ? pattern.previous : value === 1 ? pattern.next : undefined;
    if (word !== undefined) return word;
  }
  const count = memoIntl(`rn|${locale}`, () => new Intl.NumberFormat(locale)).format(Math.abs(value));
  // `Intl` reads `-0` as the past, so "0 seconds ago" and "in 0 seconds" stay apart here too.
  return (value < 0 || Object.is(value, -0) ? pattern.past : pattern.future).replace('{n}', count);
}

/**
 * Formats a signed distance in one unit ("3 days ago", "in 2 hours") for `locale`.
 *
 * Reads `Intl.RelativeTimeFormat` when the runtime has patterns for the locale, and the SDK's own wording when it
 * does not and the SDK carries a table for the language — Uzbek (`uz`, `uz-Latn`, `uz-Cyrl`), whose patterns
 * Chrome's ICU lacks and which `Intl` renders as "-4 h". Every other locale keeps `Intl`'s output, patterns or not.
 * Negative `value` is the past, positive the future; `options` are `Intl.RelativeTimeFormatOptions`.
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string,
  options?: Intl.RelativeTimeFormatOptions,
): string {
  // Built first, so an invalid locale or option throws exactly as `Intl` does whichever wording is used.
  const native = memoIntl(`r|${locale}|${intlOptionsKey(options)}`, () => new Intl.RelativeTimeFormat(locale, options));
  const table = localeTableFor(locale);
  if (table !== undefined && lacksPatterns(locale)) {
    const text = fromPattern(table.relative[singular(unit)], value, locale, options?.numeric ?? 'always');
    if (text !== undefined) return text;
  }
  return native.format(value, unit);
}
