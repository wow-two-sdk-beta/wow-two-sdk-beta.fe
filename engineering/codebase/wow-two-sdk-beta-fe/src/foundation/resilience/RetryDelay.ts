import { BackoffStrategy } from './enums/BackoffStrategy';
import { JitterStrategy } from './enums/JitterStrategy';
import { DefaultTransientStatuses, type RetryPolicy } from './RetryPolicy';

/** Computes the raw (pre-jitter) backoff delay for an attempt, capped at `maxDelayMs`. */
function backoffDelay(policy: RetryPolicy, attempt: number): number {
  const { backoff, baseDelayMs } = policy;
  const raw =
    baseDelayMs === 0 || backoff === BackoffStrategy.Constant
      ? baseDelayMs
      : backoff === BackoffStrategy.Linear
        ? baseDelayMs * attempt
        : baseDelayMs * 2 ** (attempt - 1);
  return policy.maxDelayMs != null ? Math.min(raw, policy.maxDelayMs) : raw;
}

/** Applies the policy's jitter to a delay; `previousDelayMs` powers decorrelated jitter. */
function applyJitter(policy: RetryPolicy, delay: number, previousDelayMs: number, random: () => number): number {
  switch (policy.jitter ?? JitterStrategy.None) {
    case JitterStrategy.Full:
      return random() * delay;
    case JitterStrategy.Equal:
      return delay / 2 + random() * (delay / 2);
    case JitterStrategy.Decorrelated: {
      const next = policy.baseDelayMs + random() * (previousDelayMs * 3 - policy.baseDelayMs);
      return policy.maxDelayMs != null ? Math.min(next, policy.maxDelayMs) : Math.max(next, policy.baseDelayMs);
    }
    default:
      return delay;
  }
}

/**
 * Computes the delay (ms) to wait before a retry attempt (1-based), per the policy's backoff + jitter.
 * `random` is injectable for deterministic tests.
 */
export function computeRetryDelay(
  policy: RetryPolicy,
  attempt: number,
  previousDelayMs = 0,
  random: () => number = Math.random,
): number {
  if (!Number.isSafeInteger(attempt) || attempt < 1)
    throw new RangeError('Retry attempt must be a positive safe integer.');
  if (
    !Number.isFinite(policy.baseDelayMs) ||
    policy.baseDelayMs < 0 ||
    (policy.maxDelayMs !== undefined && (!Number.isFinite(policy.maxDelayMs) || policy.maxDelayMs < 0)) ||
    !Number.isFinite(previousDelayMs) ||
    previousDelayMs < 0
  ) {
    throw new RangeError('Retry delays must be finite and non-negative.');
  }
  const sample = (): number => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Retry randomness must be in [0, 1).');
    return value;
  };
  const delay = backoffDelay(policy, attempt);
  const jittered = applyJitter(policy, delay, previousDelayMs || delay, sample);
  if (!Number.isFinite(jittered)) throw new RangeError('Retry delay overflowed; configure maxDelayMs.');
  const rounded = Math.round(jittered);
  return policy.maxDelayMs === undefined ? rounded : Math.min(rounded, Math.floor(policy.maxDelayMs));
}

/** Decides whether a failed attempt should retry — within `maxRetries` and the status is transient per the policy. */
export function shouldRetry(policy: RetryPolicy, failureCount: number, status: number): boolean {
  if (
    (!Number.isSafeInteger(policy.maxRetries) && policy.maxRetries !== Infinity) ||
    policy.maxRetries < 0 ||
    !Number.isSafeInteger(failureCount) ||
    failureCount < 0
  )
    return false;
  return failureCount < policy.maxRetries && (policy.retryableStatuses ?? DefaultTransientStatuses).includes(status);
}
