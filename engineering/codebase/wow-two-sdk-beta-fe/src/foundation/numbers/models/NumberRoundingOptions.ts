import type { NumberRounding } from '../enums/NumberRounding';
/** Precision is decimal places after the decimal point, never significant digits. */
export interface NumberRoundingOptions {
  readonly decimalPlaces: number;
  readonly rounding: NumberRounding;
}
