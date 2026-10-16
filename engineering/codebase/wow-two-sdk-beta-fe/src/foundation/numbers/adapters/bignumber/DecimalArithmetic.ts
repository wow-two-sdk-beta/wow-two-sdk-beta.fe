import BigNumber from 'bignumber.js';
import { NumberRounding } from '../../enums/NumberRounding';
import type { NumberRoundingOptions } from '../../models/NumberRoundingOptions';

// Independent constructor: consumer configuration cannot change SDK arithmetic.
const Decimal = BigNumber.clone({ RANGE: 1_000_000_000, MODULO_MODE: BigNumber.ROUND_DOWN });
const Rounding = {
  [NumberRounding.AwayFromZero]: BigNumber.ROUND_UP,
  [NumberRounding.TowardZero]: BigNumber.ROUND_DOWN,
  [NumberRounding.Ceiling]: BigNumber.ROUND_CEIL,
  [NumberRounding.Floor]: BigNumber.ROUND_FLOOR,
  [NumberRounding.HalfAwayFromZero]: BigNumber.ROUND_HALF_UP,
  [NumberRounding.HalfTowardZero]: BigNumber.ROUND_HALF_DOWN,
  [NumberRounding.HalfEven]: BigNumber.ROUND_HALF_EVEN,
  [NumberRounding.HalfCeiling]: BigNumber.ROUND_HALF_CEIL,
  [NumberRounding.HalfFloor]: BigNumber.ROUND_HALF_FLOOR,
} as const;

/** Private adapter; accepts and returns decimal text, never a vendor instance. */
export function calculateDecimal(
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'round' | 'modulo',
  left: string,
  right: string,
  options?: NumberRoundingOptions,
): string {
  const Constructor = options
    ? Decimal.clone({ DECIMAL_PLACES: options.decimalPlaces, ROUNDING_MODE: Rounding[options.rounding] })
    : Decimal;
  const value = new Constructor(left);
  const result =
    operation === 'add'
      ? value.plus(right)
      : operation === 'subtract'
        ? value.minus(right)
        : operation === 'multiply'
          ? value.multipliedBy(right)
          : operation === 'divide'
            ? value.dividedBy(right)
            : operation === 'modulo'
              ? value.modulo(right)
              : value.decimalPlaces(options!.decimalPlaces, Rounding[options!.rounding]);
  if (!result.isFinite()) throw new Error('Exact arithmetic invariant failed.');
  return result.isZero() ? '0' : result.toString();
}

export function decimalIntegerText(value: string): string {
  return new Decimal(value).toFixed();
}
