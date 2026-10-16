// Bounded concurrency — run N tasks at once out of an unbounded submission stream. The gap this fills:
// `Promise.all` starts EVERYTHING at once, which is fine for 5 items and a self-inflicted outage for 500
// (browsers stall past ~6 connections per host, servers rate-limit, memory holds every in-flight payload).
//
// `foundation/uploads`' `UploadQueue` already implements this privately (its `controllers` map is the pool
// and `pump` is the scheduler) — it predates this slice and is NOT edited from here. Whether it should
// later delegate is noted in the barrel; nothing in this file assumes it will.
//
// ORDER IS GUARANTEED FOR START, NOT FOR COMPLETION, and the distinction is the whole contract. Tasks begin
// in submission order — a FIFO queue drained one entry per freed slot — but a slow first task finishes after
// a fast second one. Any caller that needs results in input order must key them by index rather than by
// arrival, which is exactly what `mapLimit` does via `Promise.all`.
//
// Non-obvious decisions:
// - `active` is incremented SYNCHRONOUSLY inside `start`, before `fn` is called, so the counter can never
//   lag behind reality. Incrementing after an `await` would open a window where two tasks both observe a
//   free slot and the cap is briefly exceeded — the bug a test that only checks final results never sees.
// - `fn` is invoked inside an async IIFE, so a task that throws SYNCHRONOUSLY rejects its own promise
//   instead of taking down the scheduler. Without it, one bad task leaks a permanently-held slot and the
//   pool deadlocks at N-1, then N-2, until nothing runs.
// - The slot is freed in `finally` and `drain` is called there, so the pump advances on failure exactly as
//   it does on success.
// - The queue is drained with `shift()`. O(n) per drain in principle; irrelevant against the cost of the
//   async work being scheduled, and it keeps the pool a dozen readable lines.

/** A bounded-concurrency scheduler — hand it tasks, it runs at most N at a time. */
export interface Limiter {
  /**
   * Schedules `fn`, resolving with its result once it has run. Tasks start in submission order as slots
   * free; the returned promise settles on the task's own outcome, and a synchronous throw from `fn`
   * surfaces as a rejection.
   */
  readonly run: <T>(fn: () => PromiseLike<T> | T) => Promise<T>;

  /** How many tasks are running right now — never above the configured concurrency. */
  readonly activeCount: () => number;

  /** How many tasks are queued, waiting for a slot. */
  readonly pendingCount: () => number;

  /** The cap this limiter enforces, after clamping. */
  readonly concurrency: number;
}

/**
 * Creates a {@link Limiter} that runs at most `concurrency` tasks at once.
 *
 * One limiter per resource is the intent — a limiter is a budget for a specific bottleneck (an API's rate
 * limit, the connection pool, CPU-bound decode work), so sharing one across unrelated work couples them.
 * `concurrency` is clamped to at least `1`; a fractional value is floored.
 */
export function pLimit(concurrency: number): Limiter {
  if (Number.isNaN(concurrency)) throw new RangeError('Concurrency must be a number.');
  const limit = Math.max(1, Math.floor(concurrency));
  const queue: (() => void)[] = [];
  let active = 0;

  /** Starts the next queued task when a slot is free. Called once per completion, and once per submission. */
  function drain(): void {
    if (active >= limit) return;
    const start = queue.shift();
    if (start !== undefined) start();
  }

  function run<T>(fn: () => PromiseLike<T> | T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = (): void => {
        // Claimed before `fn` runs — see the header on why an async increment would breach the cap.
        active += 1;
        void (async (): Promise<void> => {
          try {
            resolve(await fn());
          } catch (error) {
            reject(error);
          } finally {
            active -= 1;
            drain();
          }
        })();
      };

      if (active < limit) start();
      else queue.push(start);
    });
  }

  return {
    run,
    activeCount: () => active,
    pendingCount: () => queue.length,
    concurrency: limit,
  };
}

/**
 * Maps `items` through `fn` with at most `concurrency` calls in flight, resolving to the results **in input
 * order** regardless of which finished first.
 *
 * The bounded `Promise.all`, INCLUDING its failure semantics: the returned promise rejects at the first
 * failure, but every remaining task still runs. They were all submitted up front, and the limiter's queue
 * has no knowledge of the rejection — so a failure reports early without cancelling the batch behind it.
 *
 * That is the right default for a `Promise.all` shape, and the wrong one when a later task depends on an
 * earlier one: use `sequential`, which genuinely stops. Pass a `signal` down through `fn` when the
 * remaining work must actually be cancellable, or reach for `allSettledValues` when partial success is fine.
 */
export function mapLimit<TItem, TResult>(
  items: Iterable<TItem>,
  concurrency: number,
  fn: (item: TItem, index: number) => PromiseLike<TResult> | TResult,
): Promise<TResult[]> {
  const list = [...items];
  const limiter = pLimit(concurrency);
  // `Promise.all` preserves positional order, so the result array matches `list` even though completion
  // order does not — this is why the limiter's start-order guarantee is enough.
  return Promise.all(list.map((item, index) => limiter.run(() => fn(item, index))));
}
