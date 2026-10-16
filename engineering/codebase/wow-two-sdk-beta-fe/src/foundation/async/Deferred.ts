// The externally-settled promise — a promise plus the `resolve` / `reject` that close over it, handed back
// to the caller instead of trapped inside an executor. Every other helper in this slice needs it: `pLimit`
// hands a queued task's settlers to a scheduler that runs later, and `debounceAsync` parks N callers'
// settlers until one trailing invocation resolves them all.
//
// Why hand-rolled rather than `Promise.withResolvers()`: that landed in ES2024, and this package targets
// ES2022 with a browser support floor below it. The shape is deliberately identical, so this file becomes
// a one-line delegation the day the floor moves.
//
// Non-obvious decision: the executor runs SYNCHRONOUSLY inside the `Promise` constructor, so `resolve` and
// `reject` are always assigned before the constructor returns. TypeScript cannot see that through the
// closure, hence the `!` assertions — the alternative (`| undefined` fields plus a guard on every call
// site) would push a lie about the runtime into every consumer.

/** A promise whose settlement is controlled from outside its executor. */
export interface Deferred<T> {
  /** The promise handed to waiters. Settles when {@link resolve} or {@link reject} is called. */
  readonly promise: Promise<T>;

  /** Fulfils {@link promise}. A second call (after either settler) is a no-op, per promise semantics. */
  readonly resolve: (value: T | PromiseLike<T>) => void;

  /** Rejects {@link promise}. A second call (after either settler) is a no-op, per promise semantics. */
  readonly reject: (reason?: unknown) => void;
}

/**
 * Creates a {@link Deferred} — a promise you settle later, from anywhere.
 *
 * Reach for it when the code that settles is not the code that creates: a scheduler that starts a task
 * once a slot frees, an event listener that resolves on the next message, a debounce that answers many
 * callers from one invocation. When the work is already a promise, wrap it directly — a deferred adds a
 * layer that can be forgotten unsettled.
 */
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
