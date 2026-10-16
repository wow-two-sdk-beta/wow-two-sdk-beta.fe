/** Defines how the delay between retries grows across attempts. */
export const BackoffStrategy = {
  /** Refers to a fixed delay before every retry. */
  Constant: 'constant',
  /** Refers to a delay that grows linearly with the attempt (base × attempt). */
  Linear: 'linear',
  /** Refers to a delay that doubles each attempt (base × 2^(attempt − 1)). */
  Exponential: 'exponential',
} as const;

export type BackoffStrategy = (typeof BackoffStrategy)[keyof typeof BackoffStrategy];
