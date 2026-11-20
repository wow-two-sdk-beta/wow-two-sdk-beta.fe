/** Units a relative-time pattern is written for (`Intl.RelativeTimeFormatUnit` without its plural spellings). */
export type RelativeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

/** One unit's wording: `{n}` stands for the number; the three words serve `numeric: 'auto'` at -1, 0 and 1. */
export interface RelativePattern {
  readonly past: string;
  readonly future: string;
  readonly previous?: string;
  readonly current?: string;
  readonly next?: string;
}

/** The SDK's own wording for a language whose runtime `Intl` data can be missing (Chrome's ICU has no Uzbek). */
export interface LocaleTable {
  readonly relative: Readonly<Record<RelativeUnit, RelativePattern>>;
  /** Twelve months, January first; `narrow` is the long name's first letter. */
  readonly months: { readonly long: readonly string[]; readonly short: readonly string[] };
  /** Seven weekdays, Monday first (ISO 8601); `narrow` is the long name's first letter. */
  readonly weekdays: { readonly long: readonly string[]; readonly short: readonly string[] };
}

/* The apostrophe is U+2018, as in the SDK's other Uzbek text (`O‘zbekcha`). */
const UzbekLatin: LocaleTable = {
  relative: {
    second: { past: '{n} soniya oldin', future: '{n} soniyadan keyin', current: 'hozir' },
    minute: { past: '{n} daqiqa oldin', future: '{n} daqiqadan keyin', current: 'shu daqiqa' },
    hour: { past: '{n} soat oldin', future: '{n} soatdan keyin', current: 'shu soat' },
    day: { past: '{n} kun oldin', future: '{n} kundan keyin', previous: 'kecha', current: 'bugun', next: 'ertaga' },
    week: {
      past: '{n} hafta oldin',
      future: '{n} haftadan keyin',
      previous: 'o‘tgan hafta',
      current: 'shu hafta',
      next: 'keyingi hafta',
    },
    month: {
      past: '{n} oy oldin',
      future: '{n} oydan keyin',
      previous: 'o‘tgan oy',
      current: 'shu oy',
      next: 'keyingi oy',
    },
    quarter: {
      past: '{n} chorak oldin',
      future: '{n} chorakdan keyin',
      previous: 'o‘tgan chorak',
      current: 'shu chorak',
      next: 'keyingi chorak',
    },
    year: {
      past: '{n} yil oldin',
      future: '{n} yildan keyin',
      previous: 'o‘tgan yil',
      current: 'shu yil',
      next: 'keyingi yil',
    },
  },
  months: {
    long: [
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentabr',
      'oktabr',
      'noyabr',
      'dekabr',
    ],
    short: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  },
  weekdays: {
    long: ['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'],
    short: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  },
};

const UzbekCyrillic: LocaleTable = {
  relative: {
    second: { past: '{n} сония олдин', future: '{n} сониядан кейин', current: 'ҳозир' },
    minute: { past: '{n} дақиқа олдин', future: '{n} дақиқадан кейин', current: 'шу дақиқа' },
    hour: { past: '{n} соат олдин', future: '{n} соатдан кейин', current: 'шу соат' },
    day: { past: '{n} кун олдин', future: '{n} кундан кейин', previous: 'кеча', current: 'бугун', next: 'эртага' },
    week: {
      past: '{n} ҳафта олдин',
      future: '{n} ҳафтадан кейин',
      previous: 'ўтган ҳафта',
      current: 'шу ҳафта',
      next: 'кейинги ҳафта',
    },
    month: {
      past: '{n} ой олдин',
      future: '{n} ойдан кейин',
      previous: 'ўтган ой',
      current: 'шу ой',
      next: 'кейинги ой',
    },
    quarter: {
      past: '{n} чорак олдин',
      future: '{n} чоракдан кейин',
      previous: 'ўтган чорак',
      current: 'шу чорак',
      next: 'кейинги чорак',
    },
    year: {
      past: '{n} йил олдин',
      future: '{n} йилдан кейин',
      previous: 'ўтган йил',
      current: 'шу йил',
      next: 'кейинги йил',
    },
  },
  months: {
    long: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'],
    short: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  },
  weekdays: {
    long: ['душанба', 'сешанба', 'чоршанба', 'пайшанба', 'жума', 'шанба', 'якшанба'],
    short: ['Ду', 'Се', 'Чо', 'Па', 'Жу', 'Ша', 'Як'],
  },
};

/**
 * The SDK table for a locale tag, or `undefined` when the SDK carries none. Uzbek is the only language so far:
 * `uz` and `uz-Latn` read Latin, `uz-Cyrl` Cyrillic, and Arabic-script Uzbek (`uz-Arab`, `uz-AF`) has no table.
 */
export function localeTableFor(locale: string): LocaleTable | undefined {
  const [language, ...subtags] = locale.toLowerCase().split('-');
  if (language !== 'uz') return undefined;
  // Subtags past a singleton (`-u-nu-latn`, `-x-private`) are extensions, never a script or region.
  const singleton = subtags.findIndex((subtag) => subtag.length === 1);
  const own = singleton === -1 ? subtags : subtags.slice(0, singleton);
  const script = /^[a-z]{4}$/.test(own[0] ?? '') ? own[0] : undefined;
  if (script === 'cyrl') return UzbekCyrillic;
  if (script === 'latn') return UzbekLatin;
  if (script !== undefined) return undefined;
  return own.includes('af') ? undefined : UzbekLatin;
}
