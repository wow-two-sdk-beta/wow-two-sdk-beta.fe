// Cancellation seam — turns an `AbortSignal` into a promise rejection, for the vast majority of async work
// that has no native `signal` parameter of its own (only `fetch` and a handful of platform APIs do).
//
// THE ALREADY-ABORTED CASE IS THE ONE EVERYONE FORGETS. A signal handed in already aborted fires no `abort`
// event — the event has been and gone. Code that only calls `addEventListener` therefore waits forever on a
// signal that is *already* cancelled, which is the worst possible reading of "cancelled". Both helpers here
// check `signal.aborted` FIRST, before any listener is attached, and `withAbort` never even invokes `fn`.
//
// ABORTING DETACHES THE CALLER; IT DOES NOT CANCEL THE WORK. Nothing here can stop an already-running
// promise — that power does not exist in the promise model. The underlying operation runs to completion and
// its result is discarded. Pass the signal INTO the operation (`withAbort` hands it to `fn` for exactly
// this) whenever the operation can honour one; otherwise accept that an aborted `abortable` leaves work
// running in the background.
//
// WE ALWAYS REJECT WITH OUR OWN `AbortError`, NEVER WITH `signal.reason`, which is a deliberate deviation
// from `signal.throwIfAborted()`. `abort(reason)` accepts ANY value, so forwarding it would let an abort
// arrive as, say, a plain `Error` that `isAbortError` does not recognize — and an unrecognized abort is a
// live bug: `retryAsync` would retry a cancelled call, and `UploadQueue` would mark a cancel as a failure.
// The invariant that every consumer keys on (`isAbortError(caught) === true` for every cancellation) is
// worth more than reason pass-through, so the reason is preserved on `cause` instead of in the identity.
//
// LISTENER DISCIPLINE: every listener is `{ once: true }` (self-removing when it fires) AND explicitly
// removed on both settle paths. A signal outlives the call it cancels — one long-lived signal driving
// hundreds of short calls would otherwise accumulate a listener per call and leak every closure it holds.

/**
 * The cancellation error every helper in this slice rejects with. Named `AbortError` so `isAbortError`
 * from `foundation/errors` recognizes it.
 *
 * Prefer `isAbortError(caught)` over `caught instanceof AbortError`: a cancellation that originates in
 * `fetch` is a `DOMException`, not this class, and only the name-keyed recognizer catches both.
 */
export class AbortError extends Error {
  /** Creates a cancellation error; pass `cause` to preserve the signal's abort reason. */
  constructor(message = 'The operation was aborted.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'AbortError';
  }
}

/**
 * Builds the {@link AbortError} for a fired signal, preserving `signal.reason` as `cause`. Internal to the
 * slice; not barrelled — consumers construct {@link AbortError} directly.
 */
export function abortErrorFor(signal: AbortSignal): AbortError {
  const reason: unknown = signal.reason;
  return reason === undefined ? new AbortError() : new AbortError(undefined, { cause: reason });
}

/**
 * Races a promise against a signal, rejecting with an {@link AbortError} the moment the signal fires.
 *
 * An already-aborted signal rejects without attaching a listener. The abort listener is removed on every
 * exit path. Remember the header's warning: `promise` keeps running after an abort — its eventual result
 * is dropped.
 */
export function abortable<T>(promise: PromiseLike<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return Promise.resolve(promise);
  if (signal.aborted) {
    void Promise.resolve(promise).catch(() => undefined);
    return Promise.reject(abortErrorFor(signal));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(abortErrorFor(signal));
    };
    signal.addEventListener('abort', onAbort, { once: true });

    // Both handlers detach the listener before settling. Redundant with `once` on the abort path, and
    // load-bearing on every other path: a promise that resolves normally must not leave a listener behind.
    void Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Runs `fn` under a signal, handing it the signal so it can cancel the underlying work for real, and
 * rejecting with an {@link AbortError} if the signal fires first.
 *
 * The preferred entry point over {@link abortable}: `fn` is never invoked at all when the signal is
 * already aborted, so no work starts that is known to be unwanted. A synchronous throw from `fn` surfaces
 * as a rejection, never as a synchronous throw at the call site.
 */
export function withAbort<T>(signal: AbortSignal, fn: (signal: AbortSignal) => PromiseLike<T> | T): Promise<T> {
  if (signal.aborted) return Promise.reject(abortErrorFor(signal));

  let started: PromiseLike<T> | T;
  try {
    started = fn(signal);
  } catch (error) {
    return Promise.reject(error);
  }
  return abortable(Promise.resolve(started), signal);
}
