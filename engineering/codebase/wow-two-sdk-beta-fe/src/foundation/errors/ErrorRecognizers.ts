import { isObjectLike, readMember } from './ErrorLike';

/** Reads a value's `name` as a string — the property both recognizers key off. A throwing getter reads as absent. */
function nameOf(value: unknown): string | undefined {
  if (!isObjectLike(value)) return undefined;
  const name = readMember(value, 'name');
  return typeof name === 'string' ? name : undefined;
}

/**
 * Checks whether a caught value is a cancellation — the `AbortError` every `fetch` / `AbortController`
 * path produces. The one recognizer every request layer needs: an abort means the caller moved on, so
 * it must be swallowed, never reported as a failure.
 *
 * Matched on `name`, deliberately not `instanceof DOMException`: the check has to hold for a
 * `DOMException` from another realm (iframe · worker), for environments with no `DOMException` global,
 * and for the plain `{ name: 'AbortError' }` that libraries and test doubles throw.
 */
export function isAbortError(value: unknown): boolean {
  return nameOf(value) === 'AbortError';
}

/**
 * Checks whether a caught value is a timeout — `AbortSignal.timeout()` rejects with a `TimeoutError`
 * `DOMException`, and libraries copy that name.
 *
 * Name-only by design: no substring match on `message`. The word "timeout" appearing in prose is not a
 * contract, and matching it would misclassify unrelated failures (and break under translation).
 */
export function isTimeoutError(value: unknown): boolean {
  return nameOf(value) === 'TimeoutError';
}
