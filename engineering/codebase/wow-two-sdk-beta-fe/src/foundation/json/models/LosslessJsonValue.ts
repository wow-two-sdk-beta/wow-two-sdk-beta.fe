import type { ExactNumber } from '../../numbers';
/** Parsed numeric values always use the SDK type, including small integers. */
export type LosslessJsonValue =
  null | boolean | string | ExactNumber | LosslessJsonValue[] | { [key: string]: LosslessJsonValue };
