import { createCollator, isRegionCode, regionFlag, regionName } from '../../../foundation/i18n';

/** One offered country: how it reads on the trigger and the row, and the text the search matches against. */
export interface CountryOption {
  /** The uppercase ISO 3166-1 alpha-2 code — the picker's value. */
  readonly code: string;

  /** The name in the picker's locale, English where the runtime has none. */
  readonly name: string;

  /** The flag emoji. */
  readonly flag: string;

  /** The trigger text — the flag, then the name. */
  readonly label: string;

  /** Every spelling the search accepts: both names, with and without marks and apostrophes, and the code. */
  readonly text: string;
}

/** The apostrophe lookalikes a reader may type for one another — `Oʻzbekiston`, `O‘zbekiston`, `O'zbekiston`. */
const Apostrophes = ["'", 'ʻ', 'ʼ', '‘', '’', '`', '´'] as const;
const HasApostrophe = /['ʻʼ‘’`´]/;
const EveryApostrophe = /['ʻʼ‘’`´]/g;

/** @internal A name without its combining marks (`Türkiye` → `Turkiye`). */
function withoutMarks(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '');
}

/** @internal Every spelling of the names the search accepts, joined — the code last. */
function searchText(code: string, names: ReadonlyArray<string>): string {
  const spellings = new Set<string>();
  for (const name of names) {
    for (const spelling of [name, withoutMarks(name)]) {
      spellings.add(spelling);
      if (!HasApostrophe.test(spelling)) continue;
      for (const mark of Apostrophes) spellings.add(spelling.replace(EveryApostrophe, mark));
      spellings.add(spelling.replace(EveryApostrophe, ''));
    }
  }
  return [...spellings, code].join(' ');
}

/** Builds the option for one code in a locale. */
export function countryOption(code: string, locale: string): CountryOption {
  const name = regionName(code, locale);
  const flag = regionFlag(code);
  return { code, name, flag, label: `${flag} ${name}`, text: searchText(code, [name, regionName(code, 'en')]) };
}

/** Uppercases a list of codes, dropping unknown ones and duplicates. `undefined` stays `undefined`. */
export function normalizeCodes(codes: ReadonlyArray<string> | undefined): ReadonlyArray<string> | undefined {
  if (!codes) return undefined;
  return [...new Set(codes.map((code) => code.toUpperCase()).filter(isRegionCode))];
}

/** Compares two names for a locale, English when the runtime rejects the locale. */
export function compareNames(left: string, right: string, locale: string): number {
  try {
    return createCollator(locale).compare(left, right);
  } catch {
    return createCollator('en').compare(left, right);
  }
}
