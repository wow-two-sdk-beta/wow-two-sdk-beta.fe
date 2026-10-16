/** Defines how jitter randomizes a computed retry delay — spreading retries to avoid a thundering herd. */
export const JitterStrategy = {
  /** Refers to no jitter — the exact computed delay. */
  None: 'none',
  /** Refers to full jitter — a uniform random value in `[0, delay]`. */
  Full: 'full',
  /** Refers to equal jitter — `delay/2 + random[0, delay/2]`. */
  Equal: 'equal',
  /** Refers to decorrelated jitter (AWS / Polly) — random growth off the previous delay. */
  Decorrelated: 'decorrelated',
} as const;

export type JitterStrategy = (typeof JitterStrategy)[keyof typeof JitterStrategy];
