import { describe, expect, it } from 'vitest';
import BigNumber from 'bignumber.js';
import { ExactNumber, NumberFailureCode, NumberLimits, NumberRounding } from '@src/foundation/numbers';
import type { Result } from '@src/foundation/results';

function ok<T, F>(result: Result<T, F>): T {
  if (!result.ok) throw new Error('Unexpected failure: ' + JSON.stringify(result.failure));
  return result.value;
}
const n = (text: string): ExactNumber => ok(ExactNumber.parse(text));
const text = (result: ReturnType<ExactNumber['add']>): string => ok(result).toString();
const rounding = (decimalPlaces: number, mode = NumberRounding.HalfEven) => ({ decimalPlaces, rounding: mode });

// Independent scaled-integer decimal oracle. No vendor arithmetic or SDK conversion methods.
function scaled(coefficient: bigint, scale: number): string {
  const sign = coefficient < 0n ? '-' : '';
  const digits = (coefficient < 0n ? -coefficient : coefficient).toString().padStart(scale + 1, '0');
  return scale === 0 ? sign + digits : sign + digits.slice(0, -scale) + '.' + digits.slice(-scale);
}

describe('ExactNumber', () => {
  it.each([
    '0',
    '-0',
    '-0.00e+2',
    '123.4500',
    '1E+00004',
    '9223372036854775807',
    '-9223372036854775808',
    '79228162514264337593543950335',
    '0.1234567890123456789012345678',
    '1e999999999999999999999999',
  ])('retains the token %s', (token) => {
    const value = n(token);
    expect(value.toString()).toBe(token);
    expect(String(value)).toBe(token);
    expect(Object.isFrozen(value)).toBe(true);
    expect(ExactNumber.isExactNumber(value)).toBe(true);
  });
  it.each(['', ' 1', '1 ', '+1', '.1', '1.', '01', '-01', '1e', 'NaN', 'Infinity', '0xff', '1_000', '1\n', '1\r\n'])(
    'rejects malformed numeric input %j',
    (token) => {
      expect(ExactNumber.parse(token)).toMatchObject({ ok: false, failure: { code: NumberFailureCode.InvalidSyntax } });
    },
  );
  it('rejects non-string inputs and structural impostors', () => {
    expect(ExactNumber.parse(1 as unknown as string).ok).toBe(false);
    expect(ExactNumber.isExactNumber({ toString: () => '1' })).toBe(false);
    expect(() => n('1').add({} as ExactNumber)).toThrow(TypeError);
  });
  it('traps implicit numeric/default coercion and native JSON serialization', () => {
    const value = n('0.1');
    expect(() => Number(value)).toThrow(TypeError);
    expect(() => (value as unknown as number) + 1).toThrow(TypeError);
    expect(() => (value as unknown as number) < 1).toThrow(TypeError);
    expect(() => JSON.stringify({ value })).toThrow(TypeError);
    expect(value === n('0.1')).toBe(false);
    expect(ok(value.equals(n('0.10')))).toBe(true);
  });
  it('preserves negative zero tokens and canonicalizes arithmetic zero', () => {
    const zero = n('-0.00E+2');
    expect(zero.isNegativeZero()).toBe(true);
    expect(zero.isInteger()).toBe(true);
    expect(ok(zero.toBigInt())).toBe(0n);
    expect(Object.is(ok(zero.toSafeInteger()), -0)).toBe(true);
    expect(zero.absolute().toString()).toBe('0.00E+2');
    expect(zero.negate().negate().toString()).toBe('-0.00E+2');
    expect(text(zero.add(n('0')))).toBe('0');
    expect(ok(zero.compare(n('0')))).toBe(0);
  });
  it('matches independent BigInt exact arithmetic across signs, scales and large coefficients', () => {
    const coefficients = [-9223372036854775808n, -12345001n, -1n, 0n, 1n, 12345001n, 9223372036854775807n];
    for (const a of coefficients)
      for (const b of coefficients)
        for (const sa of [0, 2, 8])
          for (const sb of [0, 3]) {
            const left = n(scaled(a, sa)),
              right = n(scaled(b, sb));
            const scale = Math.max(sa, sb);
            const aa = a * 10n ** BigInt(scale - sa),
              bb = b * 10n ** BigInt(scale - sb);
            const assertExact = (actual: ExactNumber, expected: bigint, resultScale: number) => {
              // Scale the exact output token using independent decimal parsing and BigInt only.
              const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(actual.toString())!;
              const fraction = match[3] ?? '';
              let coefficient = BigInt(match[1]! + match[2]! + fraction);
              const shift = resultScale + Number(match[4] ?? 0) - fraction.length;
              if (shift >= 0) coefficient *= 10n ** BigInt(shift);
              else {
                expect(coefficient % 10n ** BigInt(-shift)).toBe(0n);
                coefficient /= 10n ** BigInt(-shift);
              }
              expect(coefficient).toBe(expected);
            };
            assertExact(ok(left.add(right)), aa + bb, scale);
            assertExact(ok(left.subtract(right)), aa - bb, scale);
            assertExact(ok(left.multiply(right)), a * b, sa + sb);
            if (b !== 0n) assertExact(ok(left.modulo(right)), aa % bb, scale);
            expect(ok(left.compare(right))).toBe(aa < bb ? -1 : aa > bb ? 1 : 0);
          }
  });
  it.each([
    ['1e999999999999999999999999', '9e999999999999999999999998', 1],
    ['-1e999999999999999999999999', '-9e999999999999999999999998', -1],
    ['1e-999999999999999999999999', '9e-999999999999999999999999', -1],
    ['-1e-999999999999999999999999', '-9e-999999999999999999999999', 1],
    ['1.20e999999999999999999999999', '120e999999999999999999999997', 0],
    ['-0e999999999999999999999999', '0e-999999999999999999999999', 0],
    ['0', '1e-999999999999999999999999', -1],
    ['0', '-1e-999999999999999999999999', 1],
    ['1e999999999999999999999999', '-1e999999999999999999999999', 1],
    ['12e999999999999999999999999', '1201e999999999999999999999997', -1],
    ['1201e999999999999999999999997', '12e999999999999999999999999', 1],
    ['-12e999999999999999999999999', '-1201e999999999999999999999997', 1],
  ])('compares huge tokens %s and %s without decimal expansion', (left, right, expected) => {
    expect(ok(n(left).compare(n(right)))).toBe(expected);
    expect(ok(n(left).equals(n(right)))).toBe(expected === 0);
  });

  it('cancels and multiplies large values without precision truncation', () => {
    expect(text(n('9007199254740993').subtract(n('9007199254740992')))).toBe('1');
    expect(text(n('0.1').add(n('0.2')))).toBe('0.3');
    expect(text(n('123456789.123456789').multiply(n('0.000000001')))).toBe('0.123456789123456789');
    const large = n('9'.repeat(1000));
    expect(ok(large.subtract(large)).isZero()).toBe(true);
  });
  it.each([
    [NumberRounding.AwayFromZero, '3', '-3'],
    [NumberRounding.TowardZero, '2', '-2'],
    [NumberRounding.Ceiling, '3', '-2'],
    [NumberRounding.Floor, '2', '-3'],
    [NumberRounding.HalfAwayFromZero, '3', '-3'],
    [NumberRounding.HalfTowardZero, '2', '-2'],
    [NumberRounding.HalfEven, '2', '-2'],
    [NumberRounding.HalfCeiling, '3', '-2'],
    [NumberRounding.HalfFloor, '2', '-3'],
  ])('rounds signed ties with %s', (mode, positive, negative) => {
    expect(text(n('5').divide(n('2'), { decimalPlaces: 0, rounding: mode }))).toBe(positive);
    expect(text(n('-5').divide(n('2'), { decimalPlaces: 0, rounding: mode }))).toBe(negative);
    expect(text(n('2.5').round({ decimalPlaces: 0, rounding: mode }))).toBe(positive);
    expect(text(n('-2.5').round({ decimalPlaces: 0, rounding: mode }))).toBe(negative);
  });
  it('requires precision/mode and handles repeating division, zero, and non-ties', () => {
    expect(text(n('1').divide(n('3'), rounding(5)))).toBe('0.33333');
    expect(text(n('2').divide(n('3'), rounding(5)))).toBe('0.66667');
    expect(text(n('1').divide(n('8'), rounding(3)))).toBe('0.125');
    expect(text(n('1.005').round(rounding(2)))).toBe('1');
    expect(text(n('3.5').round(rounding(0)))).toBe('4');
    expect(text(n('-0.001').round(rounding(2)))).toBe('0');
    expect(n('1').divide(n('0'), rounding(2))).toMatchObject({ ok: false, failure: { code: 'DivisionByZero' } });
    expect(n('1').modulo(n('-0'))).toMatchObject({ ok: false, failure: { code: 'DivisionByZero' } });
    for (const options of [
      undefined,
      {},
      { decimalPlaces: -1, rounding: NumberRounding.Floor },
      { decimalPlaces: 1.1, rounding: NumberRounding.Floor },
      { decimalPlaces: 2, rounding: 'unknown' },
    ]) {
      expect(n('1').divide(n('2'), options as never)).toMatchObject({
        ok: false,
        failure: { code: 'InvalidRounding' },
      });
    }
  });
  it('isolates vendor configuration and each operation precision', () => {
    const before = BigNumber.config();
    try {
      BigNumber.config({ DECIMAL_PLACES: 0, ROUNDING_MODE: BigNumber.ROUND_UP, RANGE: 5 });
      expect(text(n('1').divide(n('8'), rounding(3)))).toBe('0.125');
      expect(text(n('1').divide(n('3'), rounding(1)))).toBe('0.3');
      expect(text(n('1').divide(n('3'), rounding(5)))).toBe('0.33333');
      expect(text(n('1000000000000').add(n('1')))).toBe('1000000000001');
    } finally {
      BigNumber.config(before);
    }
  });
  it('converts integers explicitly and makes approximation visible', () => {
    expect(ok(n('-9223372036854775808').toBigInt())).toBe(-9223372036854775808n);
    expect(ok(n('9223372036854775807').toBigInt())).toBe(9223372036854775807n);
    expect(ok(n('1.20e1').toBigInt())).toBe(12n);
    expect(n('1.2').toBigInt()).toMatchObject({ ok: false, failure: { code: 'NonInteger' } });
    expect(n('9007199254740993').toSafeInteger()).toMatchObject({ ok: false, failure: { code: 'UnsafeConversion' } });
    expect(ok(n('9007199254740991').toSafeInteger())).toBe(Number.MAX_SAFE_INTEGER);
    expect(ok(ExactNumber.fromBigInt(9223372036854775807n)).toString()).toBe('9223372036854775807');
    expect(ExactNumber.fromSafeInteger(0.1).ok).toBe(false);
    expect(ok(n('0.1').toApproximateNumber())).toBe(0.1);
    expect(n('1e9999').toApproximateNumber().ok).toBe(false);
    expect(n('1e-9999').toApproximateNumber().ok).toBe(false);
  });
  it('preserves huge exponents at transport while bounding arithmetic and allocation', () => {
    const huge = n('1e999999999999999999999999');
    expect(huge.add(n('1'))).toMatchObject({ ok: false, failure: { code: 'ResourceLimit' } });
    expect(huge.toBigInt().ok).toBe(false);
    expect(n('1e-999999999999999999999999').isInteger()).toBe(false);
    expect(text(n('0e999999999999999999999999').add(n('1')))).toBe('1');
    expect(ExactNumber.parse('1'.repeat(NumberLimits.maxTokenCharacters + 1)).ok).toBe(false);
    const widest = n('1'.repeat(NumberLimits.maxTokenCharacters));
    expect(ExactNumber.parse(widest.negate().toString()).ok).toBe(true);
    expect(n('1').round(rounding(NumberLimits.maxDecimalPlaces + 1)).ok).toBe(false);
  });
});

it('shares immutable methods while preserving independent private numeric values', () => {
  const a = n('1.00'),
    b = n('2.00');
  expect(a.add).toBe(b.add);
  expect(Object.isFrozen(Object.getPrototypeOf(a))).toBe(true);
  expect(text(a.add(b))).toBe('3');
  expect(a.toString()).toBe('1.00');
  expect(b.toString()).toBe('2.00');
  const forged = Object.create(Object.getPrototypeOf(a)) as ExactNumber;
  expect(ExactNumber.isExactNumber(forged)).toBe(false);
  expect(() => forged.toString()).toThrow(TypeError);
  const detached = a.toString;
  expect(() => detached()).toThrow(TypeError);
});

it('rejects structured cloning rather than silently losing an exact numeric value', () => {
  expect(() => structuredClone({ amount: n('123.45') })).toThrow();
});
