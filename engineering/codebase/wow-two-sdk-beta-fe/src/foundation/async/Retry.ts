// Retry for any async function — the generic sibling of the retry loop `UploadQueue` runs over its
// transport.
//
// NO BACKOFF MATH LIVES HERE, BY RULE. `shouldRetry` decides whether to go again and `computeRetryDelay`
// sizes the wait, both from `foundation/resilience` — the same primitives `foundation/http`'s client,
// `/query`, and `uploads` already use. So a retried call in this slice backs off IDENTICALLY to every other
// retry in the app, and tuning the policy in one place moves all of them. Re-deriving exponential-with-
// jitter here would be a second, silently diverging implementation of the one thing the resilience slice
// exists to own. The only timing code below is a plain abortable `setTimeout` that waits the delay it is
// HANDED; it never computes one.
//
// `shouldRetry` IS STATUS-DRIVEN, so a caught failure is read for a numeric `status` — structurally, so an
// `ApiError` from `foundation/http`, an `UploadHttpError`, and a hand-rolled `{ status: 503 }` all
// interoperate without this slice depending on the HTTP layer. No status ⇒ `0` ⇒ transient under the
// default policy, which is the right default for the generic case: a `TypeError` from a dropped connection
// retries, a deliberate `400` does not.
//
// A CANCELLED CALL IS NEVER RETRIED. `isAbortError` short-circuits before the retry decision, plus a direct
// `signal.aborted` check for work that rejects with something else after an abort. Retrying through a
// cancel would make every cancel button a lie — the user's intent outranks the policy.
//
// Non-obvious decisions:
// - THE BACKOFF WAIT IS ABORTABLE. A 30s cap with a non-abortable sleep means a cancel is ignored for up to
//   30s; the wait resolves early on abort and the loop re-checks `signal.aborted` immediately after.
// - The rethrow goes through `toError`, which passes a real `Error` through BY IDENTITY (an `ApiError` stays
//   an `ApiError`, subclass intact) and only normalizes a non-`Error` throw. The caller is therefore
//   guaranteed an `Error` in `catch` without losing what was actually thrown.
// - `fn` receives the 1-based attempt number — enough for logging or an attempt-tagged idempotency key
//   without the caller keeping a counter alongside.

import { isAbortError, toError } from '../errors';
import { DefaultRetryPolicy, computeRetryDelay, shouldRetry, type RetryPolicy } from '../resilience';

import { abortErrorFor, abortable } from './Abort';

/**
 * Reads the HTTP status a caught failure carries, for `shouldRetry`. Returns `0` — the "network / unknown"
 * status the default policy treats as transient — when the value has no numeric `status`. Guarded, so a
 * throwing getter reads as absent rather than failing inside a `catch` block.
 */
function readErrorStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 0;
  try {
    const status: unknown = (error as { status?: unknown }).status;
    return typeof status === 'number' && Number.isFinite(status) ? status : 0;
  } catch {
    return 0;
  }
}

/**
 * Reads `signal.aborted` freshly.
 *
 * Not inlined, and not merely a style choice: `signal.aborted` is a mutable flag that flips at any moment,
 * but TypeScript's control-flow analysis treats it like a stable property. After one `if (signal?.aborted)`
 * check the type narrows to `false` for the rest of the function, and every later check — the ones AFTER an
 * `await`, which are the whole point — becomes a compile error for comparing non-overlapping types. Routing
 * each read through a call re-widens it, because a function's return cannot be narrowed by an earlier one.
 */
function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

/**
 * Waits `ms`, resolving early — never rejecting — if `signal` aborts. The caller re-checks `signal.aborted`
 * afterwards. Clears its timer and detaches its listener on both paths.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (ms <= 0 || isAborted(signal)) {
      resolve();
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      signal?.removeEventListener('abort', finish);
      resolve();
    };

    timer = setTimeout(finish, ms);
    signal?.addEventListener('abort', finish, { once: true });
  });
}

/** Configures a {@link retryAsync} call. */
export interface RetryAsyncOptions {
  /** The policy driving the decision and the delays. Defaults to `DefaultRetryPolicy` from `foundation/resilience`. */
  readonly policy?: RetryPolicy;

  /** Cancels the retry loop, even mid-backoff. Rejects with an `AbortError`; an in-flight attempt is not recalled. */
  readonly signal?: AbortSignal;
}

/**
 * Runs `fn`, retrying transient failures per the policy — attempts, backoff, and jitter all decided by
 * `foundation/resilience`.
 *
 * `fn` gets the 1-based attempt number. An `AbortError` is never retried, and neither is a failure whose
 * `status` the policy considers non-transient. Rejects with the last failure once retries are exhausted.
 *
 * `fn` must be idempotent-safe to call again — this is the caller's judgement, not something the helper can
 * check. Wrap `fn` in `withTimeout` when a hung attempt should also count as a failure; the two compose in
 * that order so each attempt gets its own deadline.
 */
export async function retryAsync<T>(
  fn: (attempt: number) => PromiseLike<T> | T,
  options: RetryAsyncOptions = {},
): Promise<T> {
  const policy = options.policy ?? DefaultRetryPolicy;
  const signal = options.signal;

  /** Failures so far — `shouldRetry`'s `failureCount`, and one less than the next attempt's number. */
  let failures = 0;
  /** The previous delay, which decorrelated jitter needs to walk forward. */
  let previousDelayMs = 0;

  for (;;) {
    if (signal !== undefined && isAborted(signal)) throw abortErrorFor(signal);

    try {
      return await abortable(Promise.resolve(fn(failures + 1)), signal);
    } catch (caught) {
      // Cancellation outranks the policy, in both shapes: the call rejected with an abort, or the signal
      // fired and the call rejected with something else entirely.
      if (isAbortError(caught)) throw toError(caught);
      if (signal !== undefined && isAborted(signal)) throw abortErrorFor(signal);

      const status = readErrorStatus(caught);
      if (!shouldRetry(policy, failures, status)) throw toError(caught);

      const attempt = failures + 1;
      const delayMs = computeRetryDelay(policy, attempt, previousDelayMs);
      policy.onRetry?.({ attempt, error: caught, status, delayMs });

      await sleep(delayMs, signal);
      if (signal !== undefined && isAborted(signal)) throw abortErrorFor(signal);

      previousDelayMs = delayMs;
      failures = attempt;
    }
  }
}
