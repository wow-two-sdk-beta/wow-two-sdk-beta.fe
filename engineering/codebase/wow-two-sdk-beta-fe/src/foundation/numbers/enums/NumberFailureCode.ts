/** Actionable failures of exact decimal operations. */
export const NumberFailureCode = {
  InvalidSyntax: 'InvalidSyntax',
  ResourceLimit: 'ResourceLimit',
  DivisionByZero: 'DivisionByZero',
  InvalidRounding: 'InvalidRounding',
  NonInteger: 'NonInteger',
  UnsafeConversion: 'UnsafeConversion',
} as const;
export type NumberFailureCode = (typeof NumberFailureCode)[keyof typeof NumberFailureCode];
