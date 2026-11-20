import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocaleFormatters, formatMonthYear, monthName, weekdayName } from '@src/foundation/i18n';

type Render = (date: number) => string;

const RealDateTimeFormat = Intl.DateTimeFormat;

/** Answers `Intl.DateTimeFormat` with `render` for the locales and options it names; the rest reaches the runtime. */
function stubRuntime(render: (locale: string, options: Intl.DateTimeFormatOptions) => Render | undefined) {
  return vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
    locale?: string | string[],
    options?: Intl.DateTimeFormatOptions,
  ) {
    const custom = typeof locale === 'string' ? render(locale, options ?? {}) : undefined;
    return custom ? ({ format: custom } as unknown as Intl.DateTimeFormat) : new RealDateTimeFormat(locale, options);
  } as never);
}

/** What Chrome's ICU answers for Uzbek: the root "M11" for a month, English for a weekday. */
const chromeUzbek = (locale: string, options: Intl.DateTimeFormatOptions): Render | undefined => {
  if (!locale.startsWith('uz')) return undefined;
  if (options.month !== undefined) return () => 'M11';
  return (date) => new RealDateTimeFormat('en', options).format(date);
};

/* The probe caches per locale, so each test names a locale of its own. */
let counter = 0;
const own = (tag: string): string => `${tag}-x-t${(counter += 1)}`;

afterEach(() => vi.restoreAllMocks());

const LatinMonths = [
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
];
const LatinMonthsShort = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const LatinWeekdays = ['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'];
const CyrillicMonths = [
  'январ',
  'феврал',
  'март',
  'апрел',
  'май',
  'июн',
  'июл',
  'август',
  'сентябр',
  'октябр',
  'ноябр',
  'декабр',
];
const CyrillicWeekdays = ['душанба', 'сешанба', 'чоршанба', 'пайшанба', 'жума', 'шанба', 'якшанба'];
const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index + 1);

describe('date names with the runtime Intl', () => {
  it('names months and weekdays as Intl does for ru and en', () => {
    expect(monthName(11, 'en')).toBe('November');
    expect(monthName(11, 'en', 'short')).toBe('Nov');
    expect(monthName(11, 'en', 'narrow')).toBe('N');
    expect(monthName(1, 'ru')).toBe('январь');
    expect(weekdayName(1, 'en')).toBe('Monday');
    expect(weekdayName(7, 'en', 'short')).toBe('Sun');
    expect(weekdayName(3, 'ru')).toBe('среда');
  });

  it('counts the weekday from Monday as 1 to Sunday as 7', () => {
    expect(range(7).map((day) => weekdayName(day, 'en'))).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
    expect(range(12).map((month) => monthName(month, 'en', 'short'))).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
  });

  it('writes the month and year the way Intl does', () => {
    expect(formatMonthYear({ year: 2026, month: 11 }, 'en')).toBe('November 2026');
    expect(formatMonthYear({ year: 2026, month: 11 }, 'ru')).toBe('ноябрь 2026 г.');
    expect(formatMonthYear({ year: 2026, month: 11, day: 20 } as { year: number; month: number }, 'en-US')).toBe(
      'November 2026',
    );
  });

  it('reads Uzbek as the table does, whichever of Intl or the table answers', () => {
    expect(monthName(11, 'uz').toLowerCase()).toBe('noyabr');
    expect(monthName(11, 'uz-Cyrl').toLowerCase()).toBe('ноябр');
    expect(weekdayName(3, 'uz').toLowerCase()).toBe('chorshanba');
    expect(formatMonthYear({ year: 2026, month: 11 }, 'uz').toLowerCase()).toMatch(/^noyabr,? 2026$/);
  });

  it('rejects a month or weekday outside its range', () => {
    expect(() => monthName(0, 'en')).toThrow(RangeError);
    expect(() => monthName(13, 'uz')).toThrow(RangeError);
    expect(() => monthName(1.5, 'en')).toThrow(RangeError);
    expect(() => weekdayName(0, 'en')).toThrow(RangeError);
    expect(() => weekdayName(8, 'uz')).toThrow(RangeError);
    expect(() => formatMonthYear({ year: 2026, month: 13 }, 'en')).toThrow(RangeError);
  });
});

describe('date names where the runtime has no Uzbek data', () => {
  it('writes the Latin months, long, short and narrow', () => {
    stubRuntime(chromeUzbek);
    const locale = own('uz');
    expect(range(12).map((month) => monthName(month, locale))).toEqual(LatinMonths);
    expect(range(12).map((month) => monthName(month, locale, 'short'))).toEqual(LatinMonthsShort);
    expect(range(12).map((month) => monthName(month, locale, 'narrow'))).toEqual([
      'Y',
      'F',
      'M',
      'A',
      'M',
      'I',
      'I',
      'A',
      'S',
      'O',
      'N',
      'D',
    ]);
  });

  it('writes the Latin weekdays Monday first, long, short and narrow', () => {
    stubRuntime(chromeUzbek);
    const locale = own('uz-Latn');
    expect(range(7).map((day) => weekdayName(day, locale))).toEqual(LatinWeekdays);
    expect(range(7).map((day) => weekdayName(day, locale, 'short'))).toEqual([
      'Du',
      'Se',
      'Ch',
      'Pa',
      'Ju',
      'Sh',
      'Ya',
    ]);
    expect(range(7).map((day) => weekdayName(day, locale, 'narrow'))).toEqual(['D', 'S', 'C', 'P', 'J', 'S', 'Y']);
  });

  it('writes the Cyrillic months and weekdays for uz-Cyrl', () => {
    stubRuntime(chromeUzbek);
    const locale = own('uz-Cyrl');
    expect(range(12).map((month) => monthName(month, locale))).toEqual(CyrillicMonths);
    expect(range(12).map((month) => monthName(month, locale, 'short'))).toEqual([
      'янв',
      'фев',
      'мар',
      'апр',
      'май',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ]);
    expect(range(7).map((day) => weekdayName(day, locale))).toEqual(CyrillicWeekdays);
    expect(range(7).map((day) => weekdayName(day, locale, 'short'))).toEqual([
      'Ду',
      'Се',
      'Чо',
      'Па',
      'Жу',
      'Ша',
      'Як',
    ]);
    expect(range(7).map((day) => weekdayName(day, locale, 'narrow'))).toEqual(['Д', 'С', 'Ч', 'П', 'Ж', 'Ш', 'Я']);
  });

  it('writes the month and year with the Latin or Cyrillic month name', () => {
    stubRuntime(chromeUzbek);
    expect(formatMonthYear({ year: 2026, month: 11 }, own('uz'))).toBe('noyabr 2026');
    expect(formatMonthYear({ year: 2026, month: 1, day: 5 } as { year: number; month: number }, own('uz-Latn'))).toBe(
      'yanvar 2026',
    );
    expect(formatMonthYear({ year: 2026, month: 11 }, own('uz-Cyrl'))).toBe('ноябр 2026');
  });

  it('serves the locale-bound facade', () => {
    stubRuntime(chromeUzbek);
    const formatters = createLocaleFormatters(own('uz'));
    expect(formatters.monthName(11)).toBe('noyabr');
    expect(formatters.monthName(11, 'short')).toBe('noy');
    expect(formatters.weekdayName(1, 'short')).toBe('Du');
    expect(formatters.monthYear({ year: 2026, month: 11 })).toBe('noyabr 2026');
  });

  it('probes months and weekdays apart: Intl keeps whichever it has', () => {
    stubRuntime((locale, options) => {
      if (!locale.startsWith('uz')) return undefined;
      return options.month !== undefined
        ? () => 'Noyabr'
        : (date) => new RealDateTimeFormat('en', options).format(date);
    });
    const locale = own('uz');
    expect(monthName(11, locale)).toBe('Noyabr');
    expect(weekdayName(3, locale)).toBe('chorshanba');
  });

  it('reads a bare number as a missing month name too', () => {
    stubRuntime((locale, options) => (locale.startsWith('uz') && options.month !== undefined ? () => '11' : undefined));
    expect(monthName(11, own('uz'))).toBe('noyabr');
  });

  it('uses Intl when it has Uzbek names, and for a language without a table', () => {
    stubRuntime((locale, options) => {
      if (locale.startsWith('xx')) return options.month !== undefined ? () => 'M11' : () => 'Wednesday';
      if (!locale.startsWith('uz')) return undefined;
      return options.month !== undefined ? () => 'Noyabr' : () => 'Chorshanba';
    });
    expect(monthName(11, own('uz'))).toBe('Noyabr');
    expect(weekdayName(3, own('uz'))).toBe('Chorshanba');
    expect(monthName(11, own('xx'))).toBe('M11');
    expect(weekdayName(3, own('xx'))).toBe('Wednesday');
    expect(monthName(11, own('uz-Arab'))).toBe('Noyabr');
  });

  it('probes once per locale', () => {
    const spy = stubRuntime(chromeUzbek);
    const locale = own('uz');
    monthName(1, locale);
    monthName(2, locale);
    monthName(3, locale, 'short');
    formatMonthYear({ year: 2026, month: 4 }, locale);
    const longProbes = spy.mock.calls.filter(([tag, options]) => tag === locale && options?.month === 'long');
    // One format instance serves the probe and the long names; none is built per call.
    expect(longProbes).toHaveLength(1);
  });
});
