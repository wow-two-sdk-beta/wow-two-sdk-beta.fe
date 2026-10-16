import { ResultExtensions, type Result } from '../results';
import type { ExactNumber as ExactNumberValue } from './models/ExactNumber';
import type { NumberFailure } from './models/NumberFailure';
import type { NumberRoundingOptions } from './models/NumberRoundingOptions';
import { NumberFailureCode } from './enums/NumberFailureCode';
import { NumberRounding } from './enums/NumberRounding';
import { NumberLimits } from './NumberLimits';
import { calculateDecimal, decimalIntegerText } from './adapters/bignumber/DecimalArithmetic';

// Public value/type pair; the instance shape is owned by its models file.
export type ExactNumber = ExactNumberValue;
interface DecimalParts {
  readonly text: string;
  readonly digits: string;
  readonly power: bigint;
  readonly negative: boolean;
}
const Values = new WeakMap<ExactNumberValue, DecimalParts>();
const NumericToken = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

function fail(code: NumberFailureCode, message: string): Result<never, NumberFailure> {
  return ResultExtensions.fail({ code, message });
}

function parts(value: ExactNumberValue): DecimalParts {
  const stored = Values.get(value);
  if (!stored) throw new TypeError('Expected an SDK ExactNumber.');
  return stored;
}

function withinWorkBudget(...values: DecimalParts[]): boolean {
  const limit = BigInt(NumberLimits.maxArithmeticPlaces);
  let low = 0n,
    high = 0n;
  for (const value of values) {
    if (value.digits === '') continue;
    const end = value.power + BigInt(value.digits.length);
    if (value.power < -limit || end > limit) return false;
    if (value.power < low) low = value.power;
    if (end > high) high = end;
  }
  // Covers alignment, multiplication coefficient growth and bounded division work.
  return (
    high - low <= limit &&
    values.reduce((sum, value) => sum + value.digits.length, 0) <= NumberLimits.maxArithmeticPlaces
  );
}

function validRounding(options: NumberRoundingOptions): boolean {
  return (
    options !== null &&
    typeof options === 'object' &&
    Number.isInteger(options.decimalPlaces) &&
    options.decimalPlaces >= 0 &&
    options.decimalPlaces <= NumberLimits.maxDecimalPlaces &&
    Object.values(NumberRounding).includes(options.rounding)
  );
}

function work(
  operation: Parameters<typeof calculateDecimal>[0],
  left: ExactNumberValue,
  right: ExactNumberValue,
  options?: NumberRoundingOptions,
): Result<ExactNumberValue, NumberFailure> {
  const a = parts(left),
    b = parts(right);
  if ((operation === 'divide' || operation === 'round') && !validRounding(options!))
    return fail(NumberFailureCode.InvalidRounding, 'Specify a supported decimal precision and rounding mode.');
  if ((operation === 'divide' || operation === 'modulo') && b.digits === '')
    return fail(NumberFailureCode.DivisionByZero, 'The divisor must be nonzero.');
  if (!withinWorkBudget(a, b)) return fail(NumberFailureCode.ResourceLimit, 'The arithmetic work budget was exceeded.');
  // Zero is sent canonically: its arbitrarily large original exponent must never reach the vendor.
  return parse(calculateDecimal(operation, a.digits === '' ? '0' : a.text, b.digits === '' ? '0' : b.text, options));
}

// Shared frozen methods avoid allocating a closure set for every JSON numeric token.
const ExactNumberPrototype = Object.freeze<ExactNumberValue>({
  add(other: ExactNumberValue) {
    return work('add', this, other);
  },
  subtract(other: ExactNumberValue) {
    return work('subtract', this, other);
  },
  multiply(other: ExactNumberValue) {
    return work('multiply', this, other);
  },
  divide(other: ExactNumberValue, options: NumberRoundingOptions) {
    return work('divide', this, other, options);
  },
  round(options: NumberRoundingOptions) {
    return work('round', this, this, options);
  },
  modulo(other: ExactNumberValue) {
    return work('modulo', this, other);
  },
  compare(other: ExactNumberValue): Result<-1 | 0 | 1, NumberFailure> {
    const value = parts(this);
    const b = parts(other);
    if (value.digits === '') return ResultExtensions.ok(b.digits === '' ? 0 : b.negative ? 1 : -1);
    if (b.digits === '') return ResultExtensions.ok(value.negative ? -1 : 1);
    if (value.negative !== b.negative) return ResultExtensions.ok(value.negative ? -1 : 1);
    const leftOrder = value.power + BigInt(value.digits.length);
    const rightOrder = b.power + BigInt(b.digits.length);
    let comparison: -1 | 0 | 1 = leftOrder < rightOrder ? -1 : leftOrder > rightOrder ? 1 : 0;
    if (comparison === 0) {
      // Equal decimal order: compare coefficients with virtual trailing zeros, never expand powers.
      for (let i = 0; i < Math.max(value.digits.length, b.digits.length); i++) {
        const leftDigit = value.digits[i] ?? '0';
        const rightDigit = b.digits[i] ?? '0';
        if (leftDigit !== rightDigit) {
          comparison = leftDigit < rightDigit ? -1 : 1;
          break;
        }
      }
    }
    return ResultExtensions.ok(value.negative ? (comparison === -1 ? 1 : comparison === 1 ? -1 : 0) : comparison);
  },
  equals(other: ExactNumberValue): Result<boolean, NumberFailure> {
    return ResultExtensions.map(this.compare(other), (comparison) => comparison === 0);
  },
  negate() {
    const value = parts(this);
    return make({
      ...value,
      text: value.negative ? value.text.slice(1) : '-' + value.text,
      negative: !value.negative,
    });
  },
  absolute() {
    const value = parts(this);
    return value.negative ? this.negate() : this;
  },
  isZero() {
    const value = parts(this);
    return value.digits === '';
  },
  isInteger() {
    const value = parts(this);
    return value.digits === '' || value.power >= 0n;
  },
  isNegativeZero() {
    const value = parts(this);
    return value.digits === '' && value.negative;
  },
  toBigInt(): Result<bigint, NumberFailure> {
    const value = parts(this);
    if (!this.isInteger()) return fail(NumberFailureCode.NonInteger, 'A fractional value cannot become an integer.');
    if (!withinWorkBudget(value))
      return fail(NumberFailureCode.ResourceLimit, 'The integer conversion work budget was exceeded.');
    return ResultExtensions.ok(value.digits === '' ? 0n : BigInt(decimalIntegerText(value.text)));
  },
  toSafeInteger(): Result<number, NumberFailure> {
    const value = parts(this);
    const integer = this.toBigInt();
    if (!integer.ok) return integer;
    if (integer.value < BigInt(Number.MIN_SAFE_INTEGER) || integer.value > BigInt(Number.MAX_SAFE_INTEGER))
      return fail(NumberFailureCode.UnsafeConversion, 'The integer is outside the safe native number range.');
    return ResultExtensions.ok(value.negative && integer.value === 0n ? -0 : Number(integer.value));
  },
  toApproximateNumber(): Result<number, NumberFailure> {
    const value = parts(this);
    const native = Number(value.text);
    return !Number.isFinite(native) || (native === 0 && value.digits !== '')
      ? fail(NumberFailureCode.UnsafeConversion, 'The native number would overflow or underflow.')
      : ResultExtensions.ok(native);
  },
  toString() {
    const value = parts(this);
    return value.text;
  },
  toJSON(): never {
    throw new TypeError('Serialize ExactNumber with LosslessJson.stringify.');
  },
  [Symbol.toPrimitive](hint: string): string {
    const value = parts(this);
    if (hint === 'string') return value.text;
    throw new TypeError('Use explicit ExactNumber arithmetic or conversion methods.');
  },
} as ExactNumberValue);

function make(value: DecimalParts): ExactNumberValue {
  const instance = Object.create(ExactNumberPrototype) as ExactNumberValue;
  // One shared own function keeps structuredClone/postMessage/IndexedDB from silently losing the value.
  Object.defineProperty(instance, 'toJSON', { value: ExactNumberPrototype.toJSON, enumerable: true });
  Values.set(instance, value);
  return Object.freeze(instance);
}

function parse(text: string): Result<ExactNumberValue, NumberFailure> {
  if (typeof text !== 'string') return fail(NumberFailureCode.InvalidSyntax, 'A JSON numeric token must be a string.');
  if (text.length - (text.startsWith('-') ? 1 : 0) > NumberLimits.maxTokenCharacters)
    return fail(NumberFailureCode.ResourceLimit, 'The numeric token is too long.');
  const match = NumericToken.exec(text);
  if (!match || match[0] !== text)
    return fail(NumberFailureCode.InvalidSyntax, 'Expected a finite JSON numeric token.');
  const fractional = match[3] ?? '';
  const coefficient = (match[2]! + fractional).replace(/^0+/, '');
  const digits = coefficient.replace(/0+$/, '');
  const power = BigInt(match[4] ?? '0') - BigInt(fractional.length) + BigInt(coefficient.length - digits.length);
  return ResultExtensions.ok(make({ text, digits, power, negative: match[1] === '-' }));
}

/** Creates immutable exact decimal values without native-number conversion. */
export const ExactNumber = Object.freeze({
  parse,
  isExactNumber(value: unknown): value is ExactNumberValue {
    return typeof value === 'object' && value !== null && Values.has(value as ExactNumberValue);
  },
  fromBigInt(value: bigint): Result<ExactNumberValue, NumberFailure> {
    return typeof value === 'bigint'
      ? parse(value.toString())
      : fail(NumberFailureCode.InvalidSyntax, 'Expected a bigint.');
  },
  fromSafeInteger(value: number): Result<ExactNumberValue, NumberFailure> {
    return Number.isSafeInteger(value)
      ? parse(Object.is(value, -0) ? '-0' : value.toString())
      : fail(
          NumberFailureCode.UnsafeConversion,
          'Only a safe native integer is accepted without an explicit decimal token.',
        );
  },
});
