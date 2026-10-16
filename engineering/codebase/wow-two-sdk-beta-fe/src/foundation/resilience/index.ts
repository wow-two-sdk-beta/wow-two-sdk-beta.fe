// resilience — foundation seam. Framework-agnostic retry primitives: a `RetryPolicy` (backoff · jitter ·
// retryable statuses) plus the pure `computeRetryDelay` / `shouldRetry` helpers that drive it. No Vue,
// no RQ — consumed by `@wow-two-beta/ui-vue/query` (`createQueryClient`) and reusable by any retry/backoff caller.
export { BackoffStrategy } from './enums/BackoffStrategy';
export { JitterStrategy } from './enums/JitterStrategy';
export { DefaultTransientStatuses, DefaultRetryPolicy, type RetryPolicy, type RetryContext } from './RetryPolicy';
export { computeRetryDelay, shouldRetry } from './RetryDelay';
