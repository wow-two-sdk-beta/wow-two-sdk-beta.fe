import type { NumberFailureCode } from '../enums/NumberFailureCode';
/** Safe, transport-independent failure of a decimal operation. */
export interface NumberFailure {
  readonly code: NumberFailureCode;
  readonly message: string;
}
