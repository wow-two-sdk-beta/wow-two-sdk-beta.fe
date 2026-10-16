import type { ApiWarning } from './ApiWarning';

/** Defines the success envelope every wow-two API wraps its payload in: `{ data: T }`, with optional advisories. */
export interface ApiResponse<T> {
  data: T;
  /** Advisory findings a successful write raised without failing; read them with `decodeWarned`. */
  warnings?: ApiWarning[];
}
