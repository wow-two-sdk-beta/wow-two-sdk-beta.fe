// Rate shaping for async functions — collapse a burst into one call (`debounceAsync`), or cap a hot path to
// one call per window (`throttleAsync`). Search-as-you-type, autosave-on-keystroke, save-on-scroll.
//
// THE SUBTLE PART, AND THE REASON THESE ARE NOT THE USUAL DEBOUNCE WRAPPED IN A PROMISE: a debounced async
// call must decide what to tell the callers it SUPERSEDES. Typing "abc" produces three calls and one
// invocation, so two promises are left over. The naive implementation — keep the latest deferred, drop the
// rest — leaves those two promises PERMANENTLY UNSETTLED. That is a silent leak with no error and no log:
// every `await` on them is parked forever, holding its whole continuation (component state, closures,
// request payloads) alive for the life of the page, and `try/finally` cleanup around such an await never
// runs. In a UI it reads as a spinner that never stops on a request nobody can point to.
//
// So EVERY superseded caller resolves with the LATEST invocation's result. Semantically honest — a debounce
// promises "the answer as of when you stopped typing", and all three callers asked the same question, so
// they get the same answer — and it makes the promise leak structurally impossible: the waiter list is
// drained on every exit path. If a caller must distinguish its own invocation from a shared one, debounce
// is the wrong primitive; use the raw call plus an abort signal.
//
// Non-obvious decisions:
// - Both wrappers expose `cancel()`, which is what makes them safe to unmount. It clears the pending timer
//   and REJECTS parked waiters with an `AbortError` rather than leaving them hanging — the same leak in a
//   different disguise. `isAbortError` recognizes it, so an effect's cleanup path swallows it normally.
// - `debounceAsync` is TRAILING-EDGE and `throttleAsync` is LEADING-EDGE, which is the useful pairing rather
//   than a symmetry oversight: debounce answers "the user stopped, act on the final state", throttle answers
//   "act now, then ignore the flood".
// - A rejection from `fn` fans out to every waiter it represented. They were all answered by that one call,
//   so they all learn it failed.
// - `throttleAsync` shares the in-flight promise for the whole window, so suppressed callers get the leading
//   call's result rather than `undefined` — no caller has to handle a "was skipped" case that would
//   otherwise infect its return type.

import { AbortError } from './Abort';
import { deferred, type Deferred } from './Deferred';

/** A trailing-edge debounced async function, plus the cancel that makes it unmount-safe. */
export interface DebouncedAsync<TArgs extends unknown[], TResult> {
  /** Schedules an invocation `ms` from now, replacing any pending one. Resolves with the latest invocation's result. */
  (...args: TArgs): Promise<TResult>;

  /** Drops the pending invocation and rejects parked callers with an `AbortError`. Safe to call when idle. */
  readonly cancel: () => void;
}

/** A leading-edge throttled async function, plus the cancel that makes it unmount-safe. */
export interface ThrottledAsync<TArgs extends unknown[], TResult> {
  /** Invokes immediately when the window is open; otherwise returns the in-flight window's promise. */
  (...args: TArgs): Promise<TResult>;

  /** Closes the current window early and clears its timer. Safe to call when idle. */
  readonly cancel: () => void;
}

/**
 * Debounces an async function on the trailing edge: a burst of calls collapses into ONE invocation, `ms`
 * after the last call, using the last call's arguments.
 *
 * Every caller in the burst — superseded ones included — resolves with that single invocation's result, so
 * no promise is ever left unsettled (see the header; this is the whole point). A rejection likewise fans
 * out to all of them. Call `cancel()` on unmount.
 */
export function debounceAsync<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => PromiseLike<TResult> | TResult,
  ms: number,
): DebouncedAsync<TArgs, TResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let waiters: Deferred<TResult>[] = [];
  let nextCall: { readonly args: TArgs } | undefined;

  /** Fires the trailing invocation and answers every caller parked behind it. */
  const invoke = (): void => {
    timer = undefined;
    const call = nextCall;
    const parked = waiters;
    // Reset BEFORE awaiting: calls arriving while `fn` is in flight belong to the next window, and must not
    // be answered by this invocation's result.
    nextCall = undefined;
    waiters = [];
    if (call === undefined) return;

    void (async (): Promise<void> => {
      try {
        const result = await fn(...call.args);
        for (const waiter of parked) waiter.resolve(result);
      } catch (error) {
        for (const waiter of parked) waiter.reject(error);
      }
    })();
  };

  const debounced = (...args: TArgs): Promise<TResult> => {
    nextCall = { args };
    const waiter = deferred<TResult>();
    waiters.push(waiter);

    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(invoke, ms);
    return waiter.promise;
  };

  return Object.assign(debounced, {
    cancel: (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      const parked = waiters;
      waiters = [];
      nextCall = undefined;
      for (const waiter of parked) waiter.reject(new AbortError('Debounced call cancelled.'));
    },
  });
}

/**
 * Throttles an async function on the leading edge: the first call runs immediately, and every call within
 * the next `ms` is suppressed — receiving the leading call's promise rather than triggering its own.
 *
 * The window opens again `ms` after the leading call, whether or not it has settled. Call `cancel()` on
 * unmount to clear the window timer.
 */
export function throttleAsync<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => PromiseLike<TResult> | TResult,
  ms: number,
): ThrottledAsync<TArgs, TResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<TResult> | undefined;

  const throttled = (...args: TArgs): Promise<TResult> => {
    if (inFlight !== undefined) return inFlight;

    // The async IIFE normalizes a synchronous throw from `fn` into a rejection, so a suppressed caller and
    // the leading caller always receive the same shape.
    const started = (async (): Promise<TResult> => fn(...args))();
    inFlight = started;

    timer = setTimeout(() => {
      timer = undefined;
      inFlight = undefined;
    }, ms);

    return started;
  };

  return Object.assign(throttled, {
    cancel: (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      inFlight = undefined;
    },
  });
}
