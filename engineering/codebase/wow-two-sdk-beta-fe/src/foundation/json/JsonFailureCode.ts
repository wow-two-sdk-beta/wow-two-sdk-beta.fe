/** Expected lossless JSON failures. */
export const JsonFailureCode = {
  InvalidSyntax: 'InvalidSyntax',
  DuplicateKey: 'DuplicateKey',
  ResourceLimit: 'ResourceLimit',
  UnsupportedValue: 'UnsupportedValue',
  CircularReference: 'CircularReference',
} as const;
export type JsonFailureCode = (typeof JsonFailureCode)[keyof typeof JsonFailureCode];
