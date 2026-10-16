// The main-thread half of the RPC: turns a `Worker`'s fire-and-forget `postMessage` pipe into typed,
// awaitable method calls.
//
// THE CENTRAL DESIGN CONSTRAINT — WHY THERE IS A MAP INSTEAD OF A LISTENER PER CALL.
// The tempting implementation is: post the request, attach a one-shot `message` listener, resolve from it,
// remove it. That reads cleanly and is WRONG, because `postMessage` gives no ordering guarantee between a
// request and its reply. A worker whose handlers are async — a `fetch`, an IndexedDB read, anything
// awaited — finishes them in completion order, not arrival order. So issue `slow()` then `fast()` and the
// replies come back `fast`, `slow`. A one-shot listener resolves the FIRST reply it sees, so `slow()`
// receives `fast()`'s value with the right type and a plausible-looking value, and `fast()` receives
// `slow()`'s. Nothing throws. There is no stack trace. The two results are simply swapped, and the bug
// only appears once two calls overlap — which in development, with one call at a time, they never do.
//
// The fix is the only fix: correlate explicitly. Every request carries a monotonic id, ONE permanent
// listener owns the pipe, and it routes each reply to the pending entry that id names. The out-of-order
// case is covered by a test that makes the worker answer the second request first.
//
// LEAK DISCIPLINE. The pending map is the one place this class can leak, since an entry holds a promise's
// resolve/reject closures alive forever. Every exit path removes its entry through the same `settle` call:
// a reply, a timeout, a worker-level error, and `terminate`. A late reply arriving after its entry is gone
// is dropped silently — it is the expected consequence of a timeout, not an error to report.
//
// TIMEOUTS ARE NOT DRIVEN FROM `foundation/resilience`, and that is deliberate rather than an oversight:
// that slice models RETRIES over HTTP statuses (`computeRetryDelay`, `shouldRetry(policy, count, status)`)
// and has no timeout primitive to reuse. A per-call deadline over a stateful pipe is a different shape —
// there is no status to classify and a retry would re-run a handler that may not be idempotent. Retrying a
// worker call is the consumer's decision, and a consumer that wants one can wrap `call` with that slice's
// helpers.
//
// ERROR ATTRIBUTION SPLITS IN TWO, because the two failures carry different amounts of information:
//  - a handler that throws is caught INSIDE the worker and replied to with its own id, so exactly one call
//    rejects and its siblings are untouched;
//  - an `ErrorEvent` on the worker itself (a script that failed to parse, a top-level throw) carries NO
//    id — nothing identifies which call, if any, provoked it, and the worker is generally unusable
//    afterwards. Rejecting only a guess would strand the rest, so every in-flight call rejects.
// An `ErrorEvent` is also not an `Error` — it is an event with `message` / `filename` / `lineno` and an
// `error` member that is `null` for a cross-origin script. That is precisely what `toError` is for.

import { toError } from '../errors';

import {
  createRequestIdAllocator,
  createRequestMessage,
  isWorkerResponseMessage,
  type WorkerResponseMessage,
} from './WorkerProtocol';

/**
 * Constrains an RPC contract to methods only — used as `TApi extends WorkerApiOf<TApi>`.
 *
 * The self-reference is not decoration, it is the only form a plain `interface` satisfies. The obvious
 * spelling, `TApi extends Record<string, Fn>`, silently rejects every `interface`: TypeScript grants an
 * implicit index signature to type ALIASES and inferred object literals but never to an interface, so
 * `interface MathApi { add(a: number, b: number): number }` — the shape this slice's own documentation
 * recommends, and the one a consumer sharing a contract between two files will reach for — fails the
 * constraint with a message about a missing index signature that says nothing about what to do. Mapping
 * over `keyof TApi` asks the same question (is every member callable?) without ever requiring one.
 *
 * `never[]` in the parameter position is the standard "any function is assignable here" trick: parameters
 * are contravariant, so it accepts every signature while `Parameters<TApi[TMethod]>` still reads a
 * concrete contract's own argument types exactly.
 */
export type WorkerApiOf<TApi> = { [TMethod in keyof TApi]: (...args: never[]) => unknown };

/** Tunes a single call. */
export interface WorkerCallOptions {
  /**
   * The deadline in milliseconds. Rejects with an `Error` named `TimeoutError` — the same name
   * `AbortSignal.timeout()` uses, so `isTimeoutError` from `foundation/errors` recognizes it. Overrides
   * the client-level default; omit (or pass a non-positive value) for no deadline.
   */
  readonly timeoutMs?: number;

  /**
   * The objects to transfer rather than clone — an `ArrayBuffer`, `MessagePort`, `ImageBitmap`, or
   * `OffscreenCanvas` reachable from `args`.
   *
   * A transferred object is NEUTERED in the sender: after the call, the caller's own `ArrayBuffer` has
   * `byteLength === 0` and reading it throws. This is the single most surprising thing about the API and
   * is the price of the move — see the `withTransfer` docs for the full note.
   */
  readonly transfer?: ReadonlyArray<Transferable>;
}

/** Tunes a client. */
export interface WorkerClientOptions {
  /** The default deadline in milliseconds applied to every call that does not set its own. Omit for none. */
  readonly timeoutMs?: number;

  /**
   * Called with the normalized error when the WORKER ITSELF fails — an `ErrorEvent` or a `messageerror`,
   * neither of which names a call. The seam for logging a broken worker; a per-call failure never reaches
   * it, since that rejects the call instead. A throw from this callback is swallowed.
   */
  readonly onError?: (error: Error) => void;
}

/** The typed handle over one worker. */
export interface WorkerClient<TApi extends WorkerApiOf<TApi>> {
  /**
   * Calls `method` on the worker and resolves with its reply. Rejects if the handler throws, the deadline
   * elapses, the worker dies, or {@link WorkerClient.terminate} is called while this is in flight.
   */
  call<TMethod extends keyof TApi & string>(
    method: TMethod,
    ...args: Parameters<TApi[TMethod]>
  ): Promise<Awaited<ReturnType<TApi[TMethod]>>>;

  /**
   * Calls `method` with per-call options — a deadline, a transfer list, or both. Otherwise identical to
   * {@link WorkerClient.call}.
   */
  callWith<TMethod extends keyof TApi & string>(
    options: WorkerCallOptions,
    method: TMethod,
    ...args: Parameters<TApi[TMethod]>
  ): Promise<Awaited<ReturnType<TApi[TMethod]>>>;

  /** The number of calls awaiting a reply — the observable that proves an exit path cleaned up after itself. */
  readonly pendingCount: number;

  /** Whether {@link WorkerClient.terminate} has run. A terminated client rejects further calls rather than hanging. */
  readonly terminated: boolean;

  /**
   * Kills the worker and rejects every in-flight call. Idempotent.
   *
   * The rejection is the point: a terminated worker will never reply, so leaving those promises pending
   * would hang each awaiting caller forever with no error to catch.
   */
  terminate(): void;
}

/** Holds the two closures and the timer belonging to one awaited call. */
interface PendingCall {
  /** The method name — carried only so a timeout / termination message can name what was lost. */
  readonly method: string;

  /** Settles the caller's promise with the worker's reply. */
  readonly resolve: (value: unknown) => void;

  /** Fails the caller's promise. */
  readonly reject: (error: Error) => void;

  /** The deadline timer, cleared on every exit path so a settled call cannot fire one later. */
  timer?: ReturnType<typeof setTimeout>;
}

/** Builds the `TimeoutError`-named error a lapsed deadline rejects with, so `isTimeoutError` recognizes it. */
function createTimeoutError(method: string, timeoutMs: number): Error {
  const error = new Error(`Worker call \`${method}\` timed out after ${timeoutMs}ms`);
  error.name = 'TimeoutError';
  return error;
}

/**
 * Wraps a `Worker` in a typed request/response client.
 *
 * The worker must run {@link exposeWorkerApi} (or speak the same envelope). `TApi` is the shared contract:
 * declare it once, use it here and to type the handler map on the worker side.
 *
 * Takes an already-constructed `Worker` rather than a factory so it stays usable with any worker the
 * consumer's bundler produced, and so nothing in this module ever touches the `Worker` constructor — which
 * is what keeps it importable under SSR.
 */
export function createWorkerClient<TApi extends WorkerApiOf<TApi>>(
  worker: Worker,
  options?: WorkerClientOptions,
): WorkerClient<TApi> {
  const pendingCalls = new Map<number, PendingCall>();
  const nextRequestId = createRequestIdAllocator();
  let terminated = false;

  /** Removes a pending entry and cancels its timer — the single exit path every settle route goes through. */
  function settle(id: number): PendingCall | undefined {
    const pending = pendingCalls.get(id);
    if (pending === undefined) return undefined;
    if (pending.timer !== undefined) clearTimeout(pending.timer);
    pendingCalls.delete(id);
    return pending;
  }

  /** Fails every in-flight call — used where the failure names no single call (worker death, termination). */
  function rejectAll(toFailure: (pending: PendingCall) => Error): void {
    for (const id of [...pendingCalls.keys()]) {
      const pending = settle(id);
      if (pending !== undefined) pending.reject(toFailure(pending));
    }
  }

  /** Hands the consumer a worker-level failure without letting their reporter's own throw escape. */
  function report(error: Error): void {
    if (options?.onError === undefined) return;
    try {
      options.onError(error);
    } catch {
      // The consumer's reporter failed. The calls have already been rejected, which is the guarantee that
      // matters; a second failure here would replace a real error with an unrelated one.
    }
  }

  /** Routes one reply to the call its id names. */
  function handleMessage(event: MessageEvent<unknown>): void {
    const message: unknown = event.data;
    // Not our envelope — the pipe is shared, so someone else's message is not an error.
    if (!isWorkerResponseMessage(message)) return;

    const pending = settle(message.id);
    // Already settled by a timeout or a `terminate`. A late reply is the expected tail of those paths.
    if (pending === undefined) return;

    const reply: WorkerResponseMessage = message;
    if (reply.ok) pending.resolve(reply.result);
    else pending.reject(toError(reply.error));
  }

  /** Fails everything in flight when the worker itself dies, since no id attributes the failure. */
  function handleError(event: ErrorEvent): void {
    // `event.error` is `null` for a cross-origin script, leaving `message` as the only signal — an
    // `ErrorEvent` is not an `Error`, which is exactly why this goes through `toError`.
    const failure = toError(event.error ?? event.message ?? 'Worker error');
    rejectAll(() => failure);
    report(failure);
  }

  /** Fails everything in flight when a reply could not be deserialized — the payload, and its id, are lost. */
  function handleMessageError(): void {
    const failure = new Error('Worker sent a message that could not be deserialized');
    rejectAll(() => failure);
    report(failure);
  }

  worker.addEventListener('message', handleMessage);
  worker.addEventListener('error', handleError);
  worker.addEventListener('messageerror', handleMessageError);

  /** Posts one request and returns the promise its reply will settle. Untyped — the wire has no types. */
  function invoke(callOptions: WorkerCallOptions, method: string, args: ReadonlyArray<unknown>): Promise<unknown> {
    if (terminated) {
      return Promise.reject(new Error(`Worker call \`${method}\` rejected: the client is terminated`));
    }

    const id = nextRequestId();

    return new Promise<unknown>((resolve, reject) => {
      const pending: PendingCall = { method, resolve, reject };
      pendingCalls.set(id, pending);

      const timeoutMs = callOptions.timeoutMs ?? options?.timeoutMs;
      if (timeoutMs !== undefined && timeoutMs > 0 && Number.isFinite(timeoutMs)) {
        pending.timer = setTimeout(() => {
          // `settle` first: the entry must be gone before the caller is rejected, or a timeout would leave
          // the map holding a settled promise's closures for as long as the client lives.
          if (settle(id) !== undefined) reject(createTimeoutError(method, timeoutMs));
        }, timeoutMs);
      }

      try {
        const request = createRequestMessage(id, method, args);
        const transfer = callOptions.transfer;
        if (transfer !== undefined && transfer.length > 0) worker.postMessage(request, [...transfer]);
        else worker.postMessage(request);
      } catch (error) {
        // `postMessage` throws synchronously on a non-cloneable argument (a function, a DOM node, a class
        // instance with methods) and on an already-detached buffer. Rejecting the call keeps every failure
        // on the promise, so a caller never has to both `await` and wrap the call in a `try`.
        if (settle(id) !== undefined) reject(toError(error));
      }
    });
  }

  function terminate(): void {
    if (terminated) return;
    terminated = true;

    rejectAll((pending) => new Error(`Worker call \`${pending.method}\` rejected: the worker was terminated`));

    worker.removeEventListener('message', handleMessage);
    worker.removeEventListener('error', handleError);
    worker.removeEventListener('messageerror', handleMessageError);
    worker.terminate();
  }

  return {
    call<TMethod extends keyof TApi & string>(method: TMethod, ...args: Parameters<TApi[TMethod]>) {
      // The one cast in this module, and an unavoidable one: a structured-clone pipe carries no type
      // information, so the contract `TApi` asserts is checked at the call site and trusted here.
      return invoke({}, method, args as readonly unknown[]) as Promise<Awaited<ReturnType<TApi[TMethod]>>>;
    },
    callWith<TMethod extends keyof TApi & string>(
      callOptions: WorkerCallOptions,
      method: TMethod,
      ...args: Parameters<TApi[TMethod]>
    ) {
      return invoke(callOptions, method, args as readonly unknown[]) as Promise<Awaited<ReturnType<TApi[TMethod]>>>;
    },
    get pendingCount() {
      return pendingCalls.size;
    },
    get terminated() {
      return terminated;
    },
    terminate,
  };
}
