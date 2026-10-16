// The deadline primitive `foundation/resilience` does not have. That slice models RETRIES over HTTP statuses
// (`shouldRetry(policy, count, status)` · `computeRetryDelay`) and deliberately owns no timeout, so every
// caller needing "fail if this takes longer than N ms" had to hand-roll one — `foundation/workers`'
// `WorkerClient` did exactly that for its per-call deadline. This is the shared implementation; retry and
// timeout stay orthogonal, and a caller wanting both composes them (`retryAsync` around `withTimeout`).
//
// THE TIMER MUST DIE ON EVERY EXIT PATH, which is the entire reason this is a shared primitive rather than
// four lines inlined per call site. A pending `setTimeout` is a live handle: in node it keeps the event loop
// alive (a CLI that finished its work hangs until the longest deadline elapses), and in a browser it pins
// every closure it captures — the promise, its result, whatever the callback closes over — for the full
// duration. A fast-resolving call under a 30s deadline therefore leaks for 30s unless the timer is cleared,
// and the leak scales with request volume. So `cleanup` runs on resolve, on reject, on abort, and on the
// deadline itself; the test asserts `vi.getTimerCount() === 0` on both settle paths.
//
// Non-obvious decisions:
// - A non-positive or non-finite `ms` means NO DEADLINE, matching `WorkerClient`'s reading, rather than
//   "expire immediately". `withTimeout(p, config.timeoutMs ?? 0)` then degrades to a plain pass-through
//   instead of failing every call, which is the safer wrong-config behaviour.
// - `onTimeout` exists because rejecting the caller does NOT stop the underlying work (see `Abort.ts`).
//   It is the hook where you abort the real operation — `onTimeout: () => controller.abort()`.
// - A THROW FROM `onTimeout` IS SWALLOWED. It fires while the timeout rejection is being built; letting it
//   escape would replace a precise `TimeoutError` with an unrelated failure from a cleanup hook, and the
//   caller would never learn the deadline was the actual cause.

import { abortErrorFor, abortable } from './Abort';

/**
 * The deadline error {@link withTimeout} rejects with. Named `TimeoutError` — the same name
 * `AbortSignal.timeout()` uses — so `isTimeoutError` from `foundation/errors` recognizes it.
 *
 * Prefer `isTimeoutError(caught)` over `caught instanceof TimeoutError`: a deadline from the platform is a
 * `DOMException`, not this class, and only the name-keyed recognizer catches both.
 */
export class TimeoutError extends Error {
  /** Creates a deadline error. */
  constructor(message = 'The operation timed out.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'TimeoutError';
  }
}

/** Configures a {@link withTimeout} call. Every member is optional. */
export interface WithTimeoutOptions {
  /** Cancels the wait early, rejecting with an `AbortError`. Honoured synchronously when already aborted. */
  readonly signal?: AbortSignal;

  /**
   * Fires when the deadline lapses, before the rejection — the seam for stopping the underlying work,
   * which the timeout itself cannot do (`onTimeout: () => controller.abort()`). A throw here is swallowed
   * so it cannot mask the {@link TimeoutError}.
   */
  readonly onTimeout?: () => void;

  /** Overrides the rejection message. Defaults to `Operation timed out after {ms}ms`. */
  readonly message?: string;
}

/**
 * Rejects with a {@link TimeoutError} if `promise` has not settled within `ms`, and clears its timer on
 * every exit path — resolve, reject, abort, and lapse alike.
 *
 * The promise keeps running after a timeout; use `options.onTimeout` to abort the work behind it. A
 * non-positive or non-finite `ms` applies no deadline.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, options: WithTimeoutOptions = {}): Promise<T> {
  const { signal, onTimeout, message } = options;

  if (!Number.isFinite(ms) || ms <= 0) return abortable(promise, signal);
  if (signal?.aborted === true) return abortable(promise, signal);

  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;

    /** The single teardown every exit path runs: kill the timer, detach the listener, both idempotent. */
    const cleanup = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (signal !== undefined && abortListener !== undefined) {
        signal.removeEventListener('abort', abortListener);
        abortListener = undefined;
      }
    };

    timer = setTimeout(() => {
      // Already fired — blank the handle first so `cleanup` does not clear a dead timer.
      timer = undefined;
      cleanup();
      try {
        onTimeout?.();
      } catch {
        // Swallowed by contract: a failing cleanup hook must not replace the timeout as the reported cause.
      }
      reject(new TimeoutError(message ?? `Operation timed out after ${ms}ms`));
    }, ms);

    if (signal !== undefined) {
      const listener = (): void => {
        cleanup();
        reject(abortErrorFor(signal));
      };
      abortListener = listener;
      signal.addEventListener('abort', listener, { once: true });
    }

    void Promise.resolve(promise).then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}
