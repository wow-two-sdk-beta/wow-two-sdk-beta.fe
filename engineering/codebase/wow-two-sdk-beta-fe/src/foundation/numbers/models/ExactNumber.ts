import type { Result } from '../../results';
import type { NumberFailure } from './NumberFailure';
import type { NumberRoundingOptions } from './NumberRoundingOptions';

declare const ExactNumberBrand: unique symbol;
/** Immutable finite decimal value; use the ExactNumber factory to create one. */
export interface ExactNumber {
  readonly [ExactNumberBrand]: true;
  /** Adds without rounding; fails if the work/output resource budget is exceeded. */
  add(other: ExactNumber): Result<ExactNumber, NumberFailure>;
  /** Subtracts without rounding, including cancellation of large values. */
  subtract(other: ExactNumber): Result<ExactNumber, NumberFailure>;
  /** Multiplies without rounding within the documented work budget. */
  multiply(other: ExactNumber): Result<ExactNumber, NumberFailure>;
  /** Divides using the caller-specified decimal places and rounding mode. */
  divide(other: ExactNumber, options: NumberRoundingOptions): Result<ExactNumber, NumberFailure>;
  /** Rounds to the caller-specified decimal places and rounding mode. */
  round(options: NumberRoundingOptions): Result<ExactNumber, NumberFailure>;
  /** Truncating remainder: result has the dividend's sign, matching JS %. */
  modulo(other: ExactNumber): Result<ExactNumber, NumberFailure>;
  /** Compares any accepted tokens using bounded lexical work without expanding exponents. */
  compare(other: ExactNumber): Result<-1 | 0 | 1, NumberFailure>;
  /** Compares numeric value, independent of identity, spelling and zero sign. */
  equals(other: ExactNumber): Result<boolean, NumberFailure>;
  /** Toggles the leading sign, including signed zero, preserving magnitude spelling. */
  negate(): ExactNumber;
  /** Removes a negative sign without changing magnitude spelling. */
  absolute(): ExactNumber;
  /** Tests numeric zero regardless of scale or exponent spelling. */
  isZero(): boolean;
  /** Tests whether the exact value has no fractional part without native conversion. */
  isInteger(): boolean;
  /** Tests whether a zero token retains a leading minus. */
  isNegativeZero(): boolean;
  /** Converts an integral value exactly; fractional values and resource excess fail. */
  toBigInt(): Result<bigint, NumberFailure>;
  /** Converts exactly inside the native safe-integer range; retains negative zero. */
  toSafeInteger(): Result<number, NumberFailure>;
  /** Explicit approximation; rejects overflow and nonzero underflow. */
  toApproximateNumber(): Result<number, NumberFailure>;
  /** Returns the original JSON numeric token; arithmetic produces canonical tokens. */
  toString(): string;
  /** Native JSON.stringify is deliberately rejected. Use LosslessJson. */
  toJSON(): never;
  /** Allows string interpolation; numeric/default coercion throws TypeError. */
  [Symbol.toPrimitive](hint: string): string;
}
