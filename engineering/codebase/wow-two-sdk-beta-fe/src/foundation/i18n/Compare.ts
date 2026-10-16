// Locale-aware string comparison — the SDK's default text comparator for sorting/filtering
// (Listbox, Combobox, DataTable, …). Backed by a cached `Intl.Collator`, numeric-aware by default.

import { intlOptionsKey, memoIntl } from './IntlCache';

/**
 * Returns a cached locale-aware `Intl.Collator`. Numeric-aware by default — `"item 2"` sorts before
 * `"item 10"`. Pass `options` to override (e.g. `{ sensitivity: 'base' }` for case-insensitive).
 */
export function createCollator(locale?: string, options?: Intl.CollatorOptions): Intl.Collator {
  const resolved = { numeric: true, sensitivity: 'variant' as const, ...options };
  const key = `c|${locale ?? ''}|${intlOptionsKey(resolved)}`;
  return memoIntl(key, () => new Intl.Collator(locale, resolved));
}

/** Locale + numeric aware string comparison — the SDK default text comparator (sorts `"2"` before `"10"`). */
export function compareStrings(a: string, b: string, locale?: string): number {
  return createCollator(locale).compare(a, b);
}
