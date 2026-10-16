// The one place in this slice that decides WHEN to reconnect — and it decides nothing itself. Every delay
// comes from `foundation/resilience`'s `computeRetryDelay`, and every "should we even try again" answer comes
// from its `shouldRetry`. That slice owns retry POLICY (growth, jitter, cap, attempt budget); this scheduler
// owns only the timer and the attempt counter. Changing how backoff behaves means editing `resilience`, never
// this file — the same split `foundation/async`'s `retryAsync` follows.
//
// WHY A SHARED SCHEDULER RATHER THAN A `setTimeout` IN EACH TRANSPORT: both `createEventStream` and
// `createSocketClient` need identical bookkeeping — the attempt count, the previous delay (decorrelated
// jitter is a function of it), a cancellable handle, and a reset on success. Written twice they drift, and
// the half that drifts is always the reset: a client that forgets to zero its counter after a successful
// reconnect spends the rest of the session waiting the maximum delay after every blip.
//
// THE STACKING GUARD IS THE LOAD-BEARING PART. `schedule()` refuses to arm a second timer while one is
// pending. Both transports can be told about the same failure through more than one path — a WebSocket that
// errors then closes fires BOTH handlers, and an `EventSource` can report an error while a retry is already
// waiting — and without this guard each path arms its own timer, so a single drop produces two connections.
// Two sockets both "work", which is why this bug survives review: the symptom is duplicated messages and a
// doubled server load, not an obvious failure.
//
// `shouldRetry` IS QUERIED WITH STATUS `0`. It grades HTTP statuses, and a dropped stream has none — `0` is
// exactly the "network / unknown" code `resilience` reserves for that, and it is a member of
// `DefaultTransientStatuses`, so a default policy treats a drop as transient. A caller who genuinely wants a
// stream that never reconnects passes `retry: false` rather than fighting the status vocabulary.

import { BackoffStrategy, JitterStrategy, computeRetryDelay, shouldRetry, type RetryPolicy } from '../resilience';

/** The status handed to `shouldRetry` for a transport-level drop — `resilience`'s "network / unknown" code. */
const TransportFailureStatus = 0;

/**
 * Provides the default reconnect policy for a long-lived connection: unbounded attempts, exponential growth
 * from 1s, capped at 30s, with equal jitter.
 *
 * Differs from `DefaultRetryPolicy` in two ways that matter for a STREAM rather than a request. Attempts are
 * unbounded because a stream's failure mode is a server restart or a laptop lid, and giving up after two
 * tries leaves a dead page that no amount of waiting fixes — a request can surface an error to the caller,
 * a background stream has nobody to tell. And the jitter is `Equal`, not `Full`: full jitter can pick a delay
 * near zero, so a single client reconnecting to a flapping server hammers it immediately, whereas equal
 * jitter guarantees a floor of half the computed delay while still spreading a whole fleet apart.
 */
export const DefaultReconnectPolicy: RetryPolicy = {
  maxRetries: Number.POSITIVE_INFINITY,
  backoff: BackoffStrategy.Exponential,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  jitter: JitterStrategy.Equal,
};

/** Configures a {@link createReconnectScheduler} instance. Every member is optional. */
export interface ReconnectSchedulerOptions {
  /** Retry policy driving the delays, or `false` to disable reconnection. Default {@link DefaultReconnectPolicy}. */
  readonly retry?: RetryPolicy | false;

  /** The randomness feeding jitter — injectable so a test can pin an exact delay. Default `Math.random`. */
  readonly random?: () => number;

  /** Fires when an attempt is armed, before the wait — the seam for logging "reconnecting in 4s (attempt 3)". */
  readonly onScheduled?: (attempt: number, delayMs: number) => void;
}

/** Schedules reconnection attempts with `foundation/resilience` backoff, at most one in flight. */
export interface ReconnectScheduler {
  /** The number of consecutive attempts armed since the last {@link ReconnectScheduler.reset}. */
  readonly attempts: number;

  /** The delay (ms) of the attempt currently waiting, or `undefined` when none is pending. */
  readonly pendingDelayMs: number | undefined;

  /**
   * Arms the next attempt after a `resilience`-computed delay.
   *
   * @param run - Invoked once the delay elapses. Not invoked if {@link ReconnectScheduler.cancel} lands first.
   * @returns `true` when an attempt is pending afterwards — including when one was ALREADY pending and this
   * call was absorbed by the stacking guard; `false` when reconnection is disabled or the budget is spent.
   */
  schedule(run: () => void): boolean;

  /** Zeroes the attempt counter after a successful connection, so the next drop starts from the base delay again. */
  reset(): void;

  /** Cancels a pending attempt and clears its timer. Idempotent, and safe when nothing is pending. */
  cancel(): void;
}

/**
 * Creates the reconnect scheduler shared by this slice's transports — one pending attempt at most, delays
 * and budget delegated wholly to `foundation/resilience`.
 *
 * @param options - The retry policy, randomness source, and scheduling hook.
 * @returns A scheduler; call `cancel()` when the owning transport closes, or its timer outlives it.
 */
export function createReconnectScheduler(options: ReconnectSchedulerOptions = {}): ReconnectScheduler {
  const { retry = DefaultReconnectPolicy, random = Math.random, onScheduled } = options;

  let attempts = 0;
  let previousDelayMs = 0;
  let pendingDelayMs: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    get attempts() {
      return attempts;
    },

    get pendingDelayMs() {
      return pendingDelayMs;
    },

    schedule(run: () => void): boolean {
      if (retry === false) return false;
      // The stacking guard — see this file's header. Reporting `true` is correct: an attempt IS pending.
      if (timer !== undefined) return true;
      if (!shouldRetry(retry, attempts, TransportFailureStatus)) return false;

      const attempt = attempts + 1;
      const delayMs = computeRetryDelay(retry, attempt, previousDelayMs, random);

      attempts = attempt;
      previousDelayMs = delayMs;
      pendingDelayMs = delayMs;

      timer = setTimeout(() => {
        // Blank both handles BEFORE running, so a `run` that fails and immediately re-schedules is not
        // rejected by the stacking guard against its own already-fired timer.
        timer = undefined;
        pendingDelayMs = undefined;
        run();
      }, delayMs);

      onScheduled?.(attempt, delayMs);
      return true;
    },

    reset(): void {
      attempts = 0;
      previousDelayMs = 0;
    },

    cancel(): void {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      pendingDelayMs = undefined;
    },
  };
}
