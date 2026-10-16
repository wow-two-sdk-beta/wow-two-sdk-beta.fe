import { isObjectLike, readMember } from './ErrorLike';
import { toError } from './ToError';

/**
 * Provides the default cap on how many links a `cause` walk yields. Bounds both a pathological chain
 * and the size of anything built from one (a log payload, a rendered detail list); 8 covers every real
 * wrap depth seen in practice with room to spare.
 */
export const DefaultMaxCauseDepth = 8;

/** Resolves a caller-supplied cap — at least 1 link (the head is always returned), never `NaN` / `Infinity`. */
function resolveCap(maxDepth: number): number {
  return Number.isFinite(maxDepth) ? Math.max(1, Math.trunc(maxDepth)) : DefaultMaxCauseDepth;
}

/**
 * Reads the underlying failure a value wraps — the standard ES2022 `cause`, as thrown
 * (`new Error(msg, { cause })`). Returns the raw value, not an `Error`: a `cause` can be anything,
 * and normalizing it here would hide what was actually attached. `undefined` when there is none.
 *
 * Never throws — a `cause` getter that throws reads as absent.
 */
export function getErrorCause(error: unknown): unknown {
  return isObjectLike(error) ? readMember(error, 'cause') : undefined;
}

/**
 * Walks the `cause` chain from an error down to its root, normalizing each link with `toError`, and
 * returns the links head-first. Always non-empty — the head normalizes even from `undefined`.
 *
 * Terminates on every input. Links are tracked by identity, so a self-referencing (`error.cause ===
 * error`) or mutually-referencing chain stops at the repeat instead of hanging, and `maxDepth` caps
 * the rest. Truncation is silent: the tail simply has no further links.
 */
export function flattenErrorChain(error: unknown, maxDepth: number = DefaultMaxCauseDepth): Error[] {
  try {
    const cap = resolveCap(maxDepth);
    const chain: Error[] = [];
    // Identity set over the RAW links, not the normalized ones: `toError` mints a fresh `Error` for
    // every non-`Error` link, so normalized identity would never repeat and never detect a cycle.
    const seen = new Set<unknown>();
    let current: unknown = error;

    while (chain.length < cap) {
      if (isObjectLike(current)) {
        if (seen.has(current)) break;
        seen.add(current);
      }
      chain.push(toError(current));

      const cause = getErrorCause(current);
      // A primitive link can carry no `cause`, so the walk always reaches this exit.
      if (cause === undefined || cause === null) break;
      current = cause;
    }

    return chain;
  } catch {
    return [toError(error)];
  }
}
