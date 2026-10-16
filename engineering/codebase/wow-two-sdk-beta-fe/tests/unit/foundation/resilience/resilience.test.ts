import { describe, expect, it } from 'vitest';
import {
  BackoffStrategy,
  computeRetryDelay,
  DefaultRetryPolicy,
  DefaultTransientStatuses,
  JitterStrategy,
  shouldRetry,
  type RetryPolicy,
} from '@src/foundation/resilience';

/*
 * Smoke depth, `unit` project (node). The random source is injected on every jitter assertion,
 * so nothing here is flaky — a jitter test that reads the real `Math.random` is a test that
 * fails once a fortnight and gets deleted.
 */

const policy = (overrides: Partial<RetryPolicy> = {}): RetryPolicy => ({
  maxRetries: 3,
  backoff: BackoffStrategy.Exponential,
  baseDelayMs: 100,
  jitter: JitterStrategy.None,
  ...overrides,
});

describe('computeRetryDelay', () => {
  it('grows exponentially off the base delay', () => {
    const p = policy();
    const delays = [1, 2, 3].map((attempt) => computeRetryDelay(p, attempt));

    expect(delays[1]).toBeGreaterThan(delays[0] ?? 0);
    expect(delays[2]).toBeGreaterThan(delays[1] ?? 0);
  });

  it('holds the base delay flat on a constant backoff', () => {
    const p = policy({ backoff: BackoffStrategy.Constant });
    expect(computeRetryDelay(p, 1)).toBe(computeRetryDelay(p, 3));
  });

  it('never exceeds the cap', () => {
    const p = policy({ maxDelayMs: 250 });
    for (const attempt of [1, 2, 3, 4, 5, 10]) {
      expect(computeRetryDelay(p, attempt)).toBeLessThanOrEqual(250);
    }
  });

  it('stays inside the computed window under full jitter', () => {
    const p = policy({ jitter: JitterStrategy.Full });
    const ceiling = computeRetryDelay(policy(), 3);

    for (const random of [0, 0.5, 0.999]) {
      const delay = computeRetryDelay(p, 3, 0, () => random);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(ceiling);
    }
  });
});

describe('shouldRetry', () => {
  it('retries a transient status and refuses a client error', () => {
    expect(shouldRetry(DefaultRetryPolicy, 1, 503)).toBe(true);
    expect(shouldRetry(DefaultRetryPolicy, 1, 400)).toBe(false);
  });

  it('stops once the retry budget is spent', () => {
    const p = policy({ maxRetries: 2 });
    expect(shouldRetry(p, 1, 503)).toBe(true);
    expect(shouldRetry(p, 2, 503)).toBe(false);
  });

  it('ships a transient-status list rather than leaving it to each caller', () => {
    expect(DefaultTransientStatuses).toContain(503);
  });
});

it('rejects invalid delay work and never exceeds a fractional cap after rounding', () => {
  expect(() => computeRetryDelay(policy(), 0)).toThrow(RangeError);
  expect(() => computeRetryDelay(policy({ baseDelayMs: NaN }), 1)).toThrow(RangeError);
  expect(() => computeRetryDelay(policy(), 2000)).toThrow(RangeError);
  expect(computeRetryDelay(policy({ maxDelayMs: 250.6 }), 2000)).toBe(250);
  expect(computeRetryDelay(policy({ baseDelayMs: 0 }), 2000)).toBe(0);
  expect(() => computeRetryDelay(policy({ jitter: JitterStrategy.Full }), 1, 0, () => 1)).toThrow(RangeError);
  expect(shouldRetry(policy({ maxRetries: Infinity }), 0, 503)).toBe(true);
  expect(shouldRetry(policy({ maxRetries: NaN }), 0, 503)).toBe(false);
  expect(shouldRetry(policy(), -1, 503)).toBe(false);
});
