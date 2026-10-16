// Two combinators, and only two — the set is deliberately tight because the platform already ships
// `Promise.all` / `race` / `any` / `allSettled`, and a slice that re-wraps them earns nothing while making
// consumers learn a second vocabulary for the same operations. Each one here justifies itself by removing a
// specific piece of boilerplate that the platform makes every caller write:
//
// - `sequential(tasks)` — `Promise.all` starts everything at once, and there is NO platform combinator for
//   "one at a time, in order". Hand-rolled it is a `for...of` with an accumulator and an `await` in the loop
//   that lint rules flag; and the obvious clever versions (`reduce` over a promise chain) are hard to read
//   and easy to get wrong. Needed whenever tasks are order-dependent — sequential migrations, an animation
//   queue, a rate-limited endpoint that tolerates exactly one call at a time.
//
// - `allSettledValues(promises)` — `Promise.allSettled` hands back a DISCRIMINATED UNION array, so every
//   caller writing "give me whatever succeeded, drop the rest" repeats the same filter-then-map on
//   `status === 'fulfilled'`, and repeats the type narrowing that goes with it. This is that line, once.
//
// `sequential` IS NOT `mapLimit(tasks, 1, …)`, which is the obvious implementation and the wrong one. A
// limiter of one gives ORDERING; it does not give SHORT-CIRCUITING. `mapLimit` submits every task up front,
// so a failure at step 2 rejects the returned promise while the scheduler happily runs steps 3..n — its
// queue knows nothing about the rejection. For the cases `sequential` exists to serve that is not a nuance
// but a hazard: run migration 3 after migration 2 failed and the damage is real. So the loop below awaits
// each task and stops at the first throw, and the delegation is deliberately NOT made. (`mapLimit` keeps
// `Promise.all` semantics on purpose — a bounded `Promise.all` should behave like one — which is exactly
// why the two cannot share an implementation.)

/**
 * Runs `tasks` one at a time, in order, resolving to their results in that same order.
 *
 * STOPS AT THE FIRST FAILURE: the rejecting task's error propagates and no later task is started, because a
 * task in a sequence generally assumes its predecessor succeeded. Use `mapLimit(tasks, 1, …)` instead when
 * every task must run regardless of the others' outcomes.
 */
export async function sequential<T>(tasks: Iterable<() => PromiseLike<T> | T>): Promise<T[]> {
  const results: T[] = [];
  // Serial by construction — the `await` inside the loop IS the feature, not an oversight.
  for (const task of tasks) results.push(await task());
  return results;
}

/**
 * Awaits every promise and resolves to the values of the ones that fulfilled, in input order, silently
 * dropping the rejections.
 *
 * Never rejects — the "best effort, partial results are fine" counterpart to `Promise.all`: warming a
 * cache, hydrating optional widgets, fanning out to mirrors. Note that failures are DISCARDED, not
 * reported; use `Promise.allSettled` directly when a caller needs to know what broke.
 */
export async function allSettledValues<T>(promises: Iterable<PromiseLike<T>>): Promise<T[]> {
  const results = await Promise.allSettled([...promises]);
  // `flatMap` over the union narrows without a type predicate, which `filter` would need.
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}
