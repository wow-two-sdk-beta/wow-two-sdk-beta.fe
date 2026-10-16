import { describe, expect, it } from 'vitest';
import { createLocaleFormatters, formatExactNumber } from '@src/foundation/i18n';
import { ExactNumber, NumberFailureCode, NumberRounding } from '@src/foundation/numbers';

function exact(token: string) {
  const result = ExactNumber.parse(token);
  if (!result.ok) throw new Error('Invalid exact-number fixture.');
  return result.value;
}

describe('exact-number locale formatting', () => {
  it('groups an Int64 without native-number conversion', () => {
    expect(formatExactNumber(exact('9223372036854775807'), 'en-US')).toEqual({
      ok: true,
      value: '9,223,372,036,854,775,807',
    });
  });

  it('localizes an exact decimal while retaining every digit', () => {
    expect(formatExactNumber(exact('12345678901234567890.125'), 'de-DE')).toEqual({
      ok: true,
      value: '12.345.678.901.234.567.890,125',
    });
  });

  it('rounds only when the caller supplies a maximum fraction contract', () => {
    expect(
      formatExactNumber(exact('-12.345'), 'en-US', {
        useGrouping: false,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        rounding: NumberRounding.HalfEven,
      }),
    ).toEqual({ ok: true, value: '-12.34' });
  });

  it('applies exceptZero after rounding', () => {
    expect(
      formatExactNumber(exact('-0.004'), 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: 'exceptZero',
      }),
    ).toEqual({ ok: true, value: '0.00' });
  });

  it('exposes the formatter through the locale-bound facade', () => {
    expect(createLocaleFormatters('en-US').exactNumber(exact('1000'))).toEqual({ ok: true, value: '1,000' });
  });

  it('returns a resource failure instead of expanding an enormous exponent', () => {
    expect(formatExactNumber(exact('1e1000000'), 'en-US')).toMatchObject({
      ok: false,
      failure: { code: NumberFailureCode.ResourceLimit },
    });
  });
});

it('formats exact money with currency minor units but no implicit precision loss', () => {
  const format = createLocaleFormatters('en-US');
  expect(format.exactCurrency(exact('9223372036854775807.125'), 'USD')).toEqual({
    ok: true,
    value: '$9,223,372,036,854,775,807.125',
  });
  expect(format.exactCurrency(exact('1'), 'USD')).toEqual({ ok: true, value: '$1.00' });
  expect(format.exactCurrency(exact('1'), 'JPY')).toEqual({ ok: true, value: '¥1' });
  expect(format.exactCurrency(exact('1'), 'KWD')).toEqual({ ok: true, value: 'KWD 1.000' });
});

it('leaves locale currency position, accounting signs and bidi marks to Intl', () => {
  expect(createLocaleFormatters('de-DE').exactCurrency(exact('1234.5'), 'EUR')).toEqual({
    ok: true,
    value: '1.234,50 €',
  });
  expect(createLocaleFormatters('en-US').exactCurrency(exact('-12.5'), 'USD', { currencySign: 'accounting' })).toEqual({
    ok: true,
    value: '($12.50)',
  });
  const native = new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'USD' }).format(-12.5);
  expect(createLocaleFormatters('ar-EG').exactCurrency(exact('-12.5'), 'USD')).toEqual({ ok: true, value: native });
});

it('scales percentages exactly before explicitly rounding their displayed value', () => {
  const format = createLocaleFormatters('en-US');
  expect(format.exactPercent(exact('0.1234567890123456789012345'))).toEqual({
    ok: true,
    value: '12.34567890123456789012345%',
  });
  expect(format.exactPercent(exact('0.12345'), { maximumFractionDigits: 2 })).toEqual({ ok: true, value: '12.34%' });
  expect(createLocaleFormatters('tr-TR').exactPercent(exact('0.5'))).toEqual({ ok: true, value: '%50' });
});

it('formats beyond native floating point magnitudes and Intl fractional precision limits', () => {
  expect(formatExactNumber(exact('1e400'), 'en-US', { useGrouping: false })).toEqual({
    ok: true,
    value: '1' + '0'.repeat(400),
  });
  expect(formatExactNumber(exact('1e-40'), 'en-US')).toEqual({ ok: true, value: '0.' + '0'.repeat(39) + '1' });
  expect(createLocaleFormatters('en-US').exactCurrency(exact('1e-40'), 'USD')).toEqual({
    ok: true,
    value: '$0.' + '0'.repeat(39) + '1',
  });
});

it('retains negative zero signs when display rounding reaches zero', () => {
  expect(formatExactNumber(exact('-0.004'), 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toEqual({
    ok: true,
    value: '-0.00',
  });
  expect(formatExactNumber(exact('-0.004'), 'en-US', { maximumFractionDigits: 2, signDisplay: 'exceptZero' })).toEqual({
    ok: true,
    value: '0',
  });
});

it('reuses bounded cached Intl formatters and locale digits across exact displays', () => {
  const original = Intl.NumberFormat;
  let count = 0;
  const proxy = new Proxy(original, {
    construct(target, args) {
      count++;
      return Reflect.construct(target, args);
    },
  });
  Intl.NumberFormat = proxy;
  try {
    const locale = 'en-US-x-exact-cache';
    const first = formatExactNumber(exact('-1234.25'), locale, { style: 'currency', currency: 'USD' });
    const initial = count;
    const second = formatExactNumber(exact('-1234.25'), locale, { currency: 'USD', style: 'currency' });
    expect(initial).toBeGreaterThan(0);
    expect(count).toBe(initial);
    expect(second).toEqual(first);
  } finally {
    Intl.NumberFormat = original;
  }
});
