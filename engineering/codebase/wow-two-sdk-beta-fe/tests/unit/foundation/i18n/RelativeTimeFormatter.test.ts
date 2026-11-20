import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocaleFormatters, formatRelativeTime } from '@src/foundation/i18n';

type Render = (value: number, unit: string) => string;

const RealRelativeTimeFormat = Intl.RelativeTimeFormat;

/** Answers `Intl.RelativeTimeFormat` with `render` for the locales it names; every other locale reaches the runtime. */
function stubRuntime(render: (locale: string) => Render | undefined) {
  return vi.spyOn(Intl, 'RelativeTimeFormat').mockImplementation(function (
    locale?: string | string[],
    options?: Intl.RelativeTimeFormatOptions,
  ) {
    const custom = typeof locale === 'string' ? render(locale) : undefined;
    return custom
      ? ({ format: custom } as unknown as Intl.RelativeTimeFormat)
      : new RealRelativeTimeFormat(locale, options);
  } as never);
}

/** What a runtime with no data for the language answers: the root fallback, `-4 h` and `+4 h`. */
const bare: Render = (value, unit) => {
  if (!Number.isFinite(value)) throw new RangeError('Value need to be finite number');
  return `${value < 0 ? '-' : '+'}${Math.abs(value)} ${unit[0]}`;
};

/* The probe and the formatter cache per locale, so each test names a locale of its own. */
let counter = 0;
const own = (tag: string): string => `${tag}-x-t${(counter += 1)}`;

afterEach(() => vi.restoreAllMocks());

describe('formatRelativeTime with the runtime Intl', () => {
  it('reads Uzbek the way the table does', () => {
    expect(formatRelativeTime(-4, 'hour', 'uz')).toBe('4 soat oldin');
    expect(formatRelativeTime(4, 'hour', 'uz')).toBe('4 soatdan keyin');
    expect(formatRelativeTime(-1, 'day', 'uz', { numeric: 'auto' })).toBe('kecha');
    expect(formatRelativeTime(0, 'second', 'uz', { numeric: 'auto' })).toBe('hozir');
  });

  it.each(['ru', 'en', 'en-US', 'de', 'tg'])('keeps what Intl writes for %s', (locale) => {
    for (const options of [undefined, { numeric: 'auto' }, { style: 'short' }] as const) {
      for (const [value, unit] of [
        [-4, 'hour'],
        [4, 'hour'],
        [-1, 'day'],
        [0, 'second'],
        [2, 'weeks'],
      ] as const) {
        expect(formatRelativeTime(value, unit, locale, options)).toBe(
          new Intl.RelativeTimeFormat(locale, options).format(value, unit),
        );
      }
    }
  });
});

describe('formatRelativeTime where the runtime has no Uzbek patterns', () => {
  const uzbek = (locale: string): Render | undefined => (locale.startsWith('uz') ? bare : undefined);

  it('writes Latin Uzbek past and future for every unit', () => {
    stubRuntime(uzbek);
    const locale = own('uz');
    expect(formatRelativeTime(-4, 'hour', locale)).toBe('4 soat oldin');
    expect(formatRelativeTime(4, 'hour', locale)).toBe('4 soatdan keyin');
    const rows = [
      ['second', 'soniya oldin', 'soniyadan keyin'],
      ['minute', 'daqiqa oldin', 'daqiqadan keyin'],
      ['hour', 'soat oldin', 'soatdan keyin'],
      ['day', 'kun oldin', 'kundan keyin'],
      ['week', 'hafta oldin', 'haftadan keyin'],
      ['month', 'oy oldin', 'oydan keyin'],
      ['quarter', 'chorak oldin', 'chorakdan keyin'],
      ['year', 'yil oldin', 'yildan keyin'],
    ] as const;
    for (const [unit, past, future] of rows) {
      expect(formatRelativeTime(-3, unit, locale)).toBe(`3 ${past}`);
      expect(formatRelativeTime(3, unit, locale)).toBe(`3 ${future}`);
    }
  });

  it('words -1, 0 and 1 under numeric auto, and keeps numbers under always', () => {
    stubRuntime(uzbek);
    const locale = own('uz-Latn');
    const auto = { numeric: 'auto' } as const;
    expect(formatRelativeTime(0, 'second', locale, auto)).toBe('hozir');
    expect(formatRelativeTime(-1, 'day', locale, auto)).toBe('kecha');
    expect(formatRelativeTime(0, 'day', locale, auto)).toBe('bugun');
    expect(formatRelativeTime(1, 'day', locale, auto)).toBe('ertaga');
    expect(formatRelativeTime(-1, 'week', locale, auto)).toBe('o‘tgan hafta');
    expect(formatRelativeTime(0, 'week', locale, auto)).toBe('shu hafta');
    expect(formatRelativeTime(1, 'week', locale, auto)).toBe('keyingi hafta');
    expect(formatRelativeTime(-1, 'month', locale, auto)).toBe('o‘tgan oy');
    expect(formatRelativeTime(0, 'month', locale, auto)).toBe('shu oy');
    expect(formatRelativeTime(1, 'month', locale, auto)).toBe('keyingi oy');
    expect(formatRelativeTime(-1, 'year', locale, auto)).toBe('o‘tgan yil');
    expect(formatRelativeTime(0, 'year', locale, auto)).toBe('shu yil');
    expect(formatRelativeTime(1, 'year', locale, auto)).toBe('keyingi yil');
    expect(formatRelativeTime(-2, 'day', locale, auto)).toBe('2 kun oldin');
    expect(formatRelativeTime(-1, 'day', locale, { numeric: 'always' })).toBe('1 kun oldin');
    expect(formatRelativeTime(0, 'second', locale)).toBe('0 soniyadan keyin');
  });

  it('uses the apostrophe the SDK uses elsewhere for Uzbek text', () => {
    stubRuntime(uzbek);
    expect(formatRelativeTime(-1, 'week', own('uz'), { numeric: 'auto' })).toContain('‘');
  });

  it('writes Cyrillic Uzbek for uz-Cyrl', () => {
    stubRuntime(uzbek);
    const locale = own('uz-Cyrl');
    const auto = { numeric: 'auto' } as const;
    expect(formatRelativeTime(-4, 'hour', locale)).toBe('4 соат олдин');
    expect(formatRelativeTime(4, 'hour', locale)).toBe('4 соатдан кейин');
    expect(formatRelativeTime(-3, 'day', locale)).toBe('3 кун олдин');
    expect(formatRelativeTime(0, 'second', locale, auto)).toBe('ҳозир');
    expect(formatRelativeTime(-1, 'day', locale, auto)).toBe('кеча');
    expect(formatRelativeTime(0, 'day', locale, auto)).toBe('бугун');
    expect(formatRelativeTime(1, 'day', locale, auto)).toBe('эртага');
    expect(formatRelativeTime(-1, 'week', locale, auto)).toBe('ўтган ҳафта');
    expect(formatRelativeTime(1, 'year', locale, auto)).toBe('кейинги йил');
  });

  it('reuses the long words for the short and narrow styles', () => {
    stubRuntime(uzbek);
    const locale = own('uz');
    expect(formatRelativeTime(-4, 'hour', locale, { style: 'short' })).toBe('4 soat oldin');
    expect(formatRelativeTime(-1, 'day', locale, { style: 'narrow', numeric: 'auto' })).toBe('kecha');
  });

  it('accepts plural unit spellings, formats the count in the locale and reads -0 as the past', () => {
    stubRuntime(uzbek);
    const locale = own('uz');
    expect(formatRelativeTime(-4, 'hours', locale)).toBe('4 soat oldin');
    expect(formatRelativeTime(-1200, 'days', locale)).toBe(`${new Intl.NumberFormat(locale).format(1200)} kun oldin`);
    expect(formatRelativeTime(-0, 'second', locale)).toBe('0 soniya oldin');
  });

  it('leaves a non-finite value to Intl, which rejects it', () => {
    stubRuntime(uzbek);
    expect(() => formatRelativeTime(Number.NaN, 'hour', own('uz'))).toThrow(RangeError);
  });

  it('serves the locale-bound facade and its cached instances', () => {
    stubRuntime(uzbek);
    const formatters = createLocaleFormatters(own('uz-Latn-UZ'));
    expect(formatters.relativeTime(-4, 'hour')).toBe('4 soat oldin');
    expect(formatters.relativeTime(4, 'hour', { numeric: 'auto' })).toBe('4 soatdan keyin');
    expect(formatters.relativeTime(-1, 'day', { numeric: 'auto' })).toBe('kecha');
  });
});

describe('the probe', () => {
  it('uses the runtime when it has Uzbek patterns', () => {
    stubRuntime((locale) => (locale.startsWith('uz') ? (value, unit) => `runtime ${value} ${unit}` : undefined));
    expect(formatRelativeTime(-4, 'hour', own('uz'))).toBe('runtime -4 hour');
    expect(formatRelativeTime(-4, 'hour', own('uz-Cyrl'))).toBe('runtime -4 hour');
  });

  it('keeps the runtime output for a language the SDK has no table for, patterns or not', () => {
    stubRuntime((locale) =>
      locale.startsWith('xx') || locale.startsWith('uz-Arab') || locale.startsWith('uz-AF') ? bare : undefined,
    );
    expect(formatRelativeTime(-4, 'hour', own('xx'))).toBe('-4 h');
    expect(formatRelativeTime(4, 'hour', own('xx-Latn'))).toBe('+4 h');
    expect(formatRelativeTime(-4, 'hour', own('uz-Arab'))).toBe('-4 h');
    expect(formatRelativeTime(-4, 'hour', own('uz-AF'))).toBe('-4 h');
  });

  it('reads a script or region only before an extension, so a -u- keyword is no script', () => {
    stubRuntime((locale) => (locale.startsWith('uz') ? bare : undefined));
    expect(formatRelativeTime(-4, 'hour', own('uz-u-nu-cyrl'))).toBe('4 soat oldin');
    expect(formatRelativeTime(-4, 'hour', own('uz-Cyrl-UZ'))).toBe('4 соат олдин');
  });

  it('probes once per locale, however many formats and option sets follow', () => {
    const spy = stubRuntime((locale) => (locale.startsWith('uz') ? bare : undefined));
    const locale = own('uz');
    formatRelativeTime(-4, 'hour', locale);
    formatRelativeTime(-5, 'hour', locale);
    formatRelativeTime(-1, 'day', locale, { numeric: 'auto' });
    formatRelativeTime(3, 'day', locale, { numeric: 'auto', style: 'short' });
    const probes = spy.mock.calls.filter(
      ([tag, options]) => tag === locale && options?.numeric === 'always' && options?.style === 'long',
    );
    expect(probes).toHaveLength(1);
  });

  it('does not probe a locale the SDK has no table for', () => {
    const spy = stubRuntime((locale) => (locale.startsWith('xx') ? bare : undefined));
    const locale = own('xx');
    formatRelativeTime(-4, 'hour', locale);
    expect(spy.mock.calls.filter(([tag]) => tag === locale)).toHaveLength(1);
  });

  it('reads a runtime that answers with a Unicode minus as having no patterns', () => {
    stubRuntime((locale) =>
      locale.startsWith('uz') ? (value) => `${value < 0 ? '−' : '+'}${Math.abs(value)} h` : undefined,
    );
    expect(formatRelativeTime(-4, 'hour', own('uz'))).toBe('4 soat oldin');
  });
});
