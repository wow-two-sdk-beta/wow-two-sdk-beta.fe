import type { WorkerRunResult } from './models/WorkerRunResult';

// One-shot offloading: run a self-contained function on another thread without authoring a worker file,
// wiring it into the bundler, or keeping a thread alive afterwards. For the one expensive pure computation
// that would otherwise block a frame — a hash over a large buffer, a sort of a hundred thousand rows,
// parsing a big CSV.
//
// THE FUNCTION IS STRINGIFIED, SO IT CANNOT CLOSE OVER ANYTHING. This is the constraint that makes or
// breaks every use of this helper, and it fails at RUNTIME, inside the other thread, with a bare
// `ReferenceError` naming a variable that is plainly in scope at the call site:
//
//   const factor = 2;
//   await runInWorker((n: number) => n * factor, [21]);   // ✗ ReferenceError: factor is not defined
//   await runInWorker((n: number, f: number) => n * f, [21, 2]); // ✓ everything arrives through args
//
// `Function.prototype.toString` returns source text, not a closure. The text is embedded in a `Blob` and
// evaluated in a scope that shares nothing with the module it was written in — no captured variables, no
// imports, no `document`, no Vue. Everything the function needs must arrive through `args`, and `args`
// must survive structured clone. The same rule voids TypeScript's help here: the compiler happily
// typechecks the captured variable it is about to strip.
//
// The mirror-image trap is the METHOD SHORTHAND. `({ work(n) { ... } }).work.toString()` yields
// `work(n) { ... }`, which is not a valid expression even wrapped in parentheses, and the worker dies on a
// syntax error. Pass a function expression or an arrow.
//
// THE BLOB URL IS REVOKED IN A `finally`. Each `createObjectURL` pins its blob in memory until revoked,
// and a revoke skipped on the failure path is a leak that only shows up in the runs that already went
// wrong. The worker is terminated there too, on every path.
//
// The result is a discriminated union rather than a throw, matching `foundation/share`'s idiom: an
// unsupported runtime (SSR, or a CSP without `worker-src blob:`) is a fact to branch on, not an exception,
// and it must be distinguishable from the function itself failing.

import { toError } from '../errors';

import { isBlobWorkerSupported } from './WorkerSupport';
export type { WorkerRunFailure } from './models/WorkerRunFailure';
export type { WorkerRunResult } from './models/WorkerRunResult';

/** Tunes a {@link runInWorker} call. */
export interface RunInWorkerOptions {
  /** Deadline (ms), omit for none. On lapse the worker is terminated and the result is `failed` (`TimeoutError`). */
  readonly timeoutMs?: number;

  /**
   * The objects to transfer into the worker instead of cloning. Each is NEUTERED in the caller: an
   * `ArrayBuffer` passed here has `byteLength === 0` once the call returns.
   */
  readonly transfer?: ReadonlyArray<Transferable>;
}

/**
 * Builds the worker source. Bespoke rather than reusing `exposeWorkerApi`, and necessarily so: a `Blob`
 * worker has no module resolution, so it cannot import this package — the protocol has to be inlined, and
 * a one-shot call needs no id correlation because exactly one request is ever in flight.
 *
 * Written in plain ES5-ish JS with no optional chaining, since the text is evaluated verbatim by whatever
 * engine the browser gives the worker rather than passing through this package's build.
 */
function buildWorkerSource(functionSource: string): string {
  return `self.onmessage = function (event) {
  Promise.resolve()
    .then(function () {
      var fn = (${functionSource});
      return fn.apply(null, event.data);
    })
    .then(function (value) {
      self.postMessage({ ok: true, value: value });
    })
    .catch(function (error) {
      var shape = { name: 'Error', message: 'Worker function failed' };
      if (error && typeof error === 'object') {
        if (typeof error.name === 'string') shape.name = error.name;
        if (typeof error.message === 'string') shape.message = error.message;
        if (typeof error.stack === 'string') shape.stack = error.stack;
      } else if (typeof error === 'string') {
        shape.message = error;
      }
      self.postMessage({ ok: false, error: shape });
    });
};`;
}

/** Narrows an inbound reply from the one-shot worker. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Runs `fn` on a throwaway worker thread and resolves with its result.
 *
 * ```ts
 * const result = await runInWorker((rows: number[]) => rows.reduce((a, b) => a + b, 0), [bigArray]);
 * if (result.ok) console.log(result.value);
 * ```
 *
 * `fn` MUST be self-contained — it is stringified, so it captures nothing from the scope it was written
 * in, and it may not be a method shorthand. Every input arrives through `args`, and both `args` and the
 * return value must survive structured clone. See the module header for the full rationale.
 *
 * Never throws: an unsupported runtime, a failed start, a thrown function, and a lapsed deadline all
 * resolve to a {@link WorkerRunResult}. The worker is terminated and the blob URL revoked on every path.
 */
export async function runInWorker<TArgs extends readonly unknown[], TValue>(
  fn: (...args: TArgs) => TValue | Promise<TValue>,
  args: TArgs,
  options?: RunInWorkerOptions,
): Promise<WorkerRunResult<TValue>> {
  if (!isBlobWorkerSupported()) return { ok: false, failure: { status: 'unsupported' } };

  let url: string | undefined;
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    url = URL.createObjectURL(new Blob([buildWorkerSource(fn.toString())], { type: 'text/javascript' }));
    const instance = new Worker(url);
    worker = instance;

    const value = await new Promise<TValue>((resolve, reject) => {
      /** Cancels the deadline so a settled run cannot be failed by its own timer afterwards. */
      const done = (): void => {
        if (timer !== undefined) clearTimeout(timer);
      };

      const { timeoutMs } = options ?? {};
      if (timeoutMs !== undefined && timeoutMs > 0 && Number.isFinite(timeoutMs)) {
        timer = setTimeout(() => {
          const error = new Error(`Worker function timed out after ${timeoutMs}ms`);
          // Named for `isTimeoutError` in `foundation/errors`, matching `AbortSignal.timeout()`.
          error.name = 'TimeoutError';
          reject(error);
        }, timeoutMs);
      }

      instance.addEventListener('message', (event: MessageEvent<unknown>) => {
        done();
        const reply: unknown = event.data;
        if (!isRecord(reply)) {
          reject(new Error('Worker sent an unrecognized reply'));
          return;
        }
        if (reply['ok'] === true) {
          resolve(reply['value'] as TValue);
          return;
        }
        reject(toError(reply['error']));
      });

      // A worker that fails to start (a syntax error from a method shorthand, a CSP refusal) reports here
      // as an `ErrorEvent`, which is not an `Error` — hence `toError` over the `message` fallback.
      instance.addEventListener('error', (event: ErrorEvent) => {
        done();
        reject(toError(event.error ?? event.message ?? 'Worker failed to start'));
      });

      instance.addEventListener('messageerror', () => {
        done();
        reject(new Error('Worker reply could not be deserialized'));
      });
      const transfer = options?.transfer;
      if (transfer !== undefined && transfer.length > 0) instance.postMessage(args, [...transfer]);
      else instance.postMessage(args);
    });

    return { ok: true, value };
  } catch (error) {
    return { ok: false, failure: { status: 'failed', error: toError(error) } };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    worker?.terminate();
    // Revoked on every path, including the ones that already failed — an un-revoked URL pins its blob for
    // the life of the document.
    if (url !== undefined) URL.revokeObjectURL(url);
  }
}
