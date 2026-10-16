import type { JsonFailureCode } from '../JsonFailureCode';
/** A safe diagnostic; does not echo potentially sensitive JSON input. */
export interface JsonFailure {
  readonly code: JsonFailureCode;
  readonly message: string;
}
