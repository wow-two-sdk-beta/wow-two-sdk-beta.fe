// async — foundation seam. The promise-combinator layer: deadlines, cancellation, bounded concurrency,
// retry, rate shaping. Dependency-free beyond two sibling foundation slices (`errors` · `resilience`), with
// no Vue, no DOM and no HTTP vocabulary, so every helper is node-testable and usable from any layer.
//
// WHY THIS SLICE EXISTS: these primitives were being hand-rolled per call site. `foundation/workers`'
// `WorkerClient` wrote its own per-call deadline because `foundation/resilience` has no timeout, and
// `foundation/uploads`' `UploadQueue` wrote its own concurrency pool. Both are correct; neither should have
// had to. `withTimeout` and `pLimit` are those two, extracted and tested once.
//
// SCOPE BOUNDARY WITH `foundation/resilience`: that slice owns the retry POLICY — how many attempts, how the
// delay grows, what counts as transient (`RetryPolicy` · `computeRetryDelay` · `shouldRetry`). This slice
// owns EXECUTION — the loop, the abortable wait, the deadline, the pool. `retryAsync` therefore delegates
// every decision and every delay to `resilience` and computes none of its own; changing backoff behaviour
// means editing that slice, never this one.
//
// ERROR IDENTITY IS NAME-KEYED, NOT CLASS-KEYED. `TimeoutError` and `AbortError` set the same `name`s the
// platform uses (`AbortSignal.timeout()` · `fetch`'s abort), so `isTimeoutError` / `isAbortError` from
// `foundation/errors` recognize both ours and the platform's. Consumers should use those recognizers rather
// than `instanceof` — an abort that originates in `fetch` is a `DOMException` and would fail the class check.
//
// NOT ADOPTED BY `uploads` (yet): `UploadQueue`'s private pool predates `pLimit` and is untouched here.
// The two are behaviourally equivalent for the scheduling part, but the queue's pool is entangled with
// per-item status, cancellation, and progress — a swap is a real refactor with real test surface, not a
// drop-in, and it belongs in a pass that owns that file.
export { deferred, type Deferred } from './Deferred';
export { TimeoutError, withTimeout, type WithTimeoutOptions } from './Timeout';
export { AbortError, abortable, withAbort } from './Abort';
export { pLimit, mapLimit, type Limiter } from './Limit';
export { retryAsync, type RetryAsyncOptions } from './Retry';
export { debounceAsync, throttleAsync, type DebouncedAsync, type ThrottledAsync } from './Rate';
export { sequential, allSettledValues } from './Combinators';

export * from './UseDebounceHandler';
export { useDebouncedValue } from './UseDebouncedValue';
