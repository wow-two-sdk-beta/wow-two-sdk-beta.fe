// Redaction runs on the way IN — inside the logger, before the record reaches any sink — rather than
// inside each sink. A sink is third-party code that may ship off the device, so a secret that reaches one
// has already leaked; asking every adapter to redact is asking for the one that forgets.
//
// Decisions:
//
// - **Keys match case-insensitively; matched values are dropped whole.** `Authorization` / `authorization`
//   / `AUTHORIZATION` are the same header. A partial mask (`sk-…f31a`) still leaks a prefix and invites a
//   per-call-site judgement about whether that is enough, so the value is replaced regardless of its type —
//   a matched key whose value is an object does not get walked.
// - **The walk copies; it never mutates.** The caller's object is theirs and is very often live
//   application state — redacting in place would erase a real token from a real session, which is exactly
//   the kind of damage a logger must never do.
// - **Recursion covers arrays and PLAIN objects only.** `Object.keys(new Date())` is empty, so walking a
//   `Date` / `Map` / `URL` / class instance would silently replace it with `{}`. Everything non-plain
//   passes through by reference — worth knowing, because a secret held on a class instance is NOT redacted.
//
// The input is assumed hostile, because a context object is assembled at a call site that may itself be
// mid-failure: a cycle is cut with `CircularMarker`, a throwing getter or `ownKeys` trap yields
// `UnreadableMarker`, and depth is capped at `DefaultMaxRedactDepth`. The cap is fail-CLOSED — the subtree
// becomes `TruncatedMarker` rather than passing through unredacted — and it is what keeps a pathological
// graph from overflowing the stack, which is the one way this could otherwise break its no-throw contract.
//
// Cycles are tracked along the current PATH (added before descending, removed after), not globally, so a
// value legitimately referenced by several siblings still renders each time instead of the second and later
// occurrences reading as circular.

import type { LogContext } from './LogRecord';

/** Provides the context keys redacted by default — the credential names that show up in practically every payload. */
export const DefaultRedactKeys: ReadonlyArray<string> = Object.freeze([
  'password',
  'token',
  'secret',
  'authorization',
  'apiKey',
]);

/** Provides the placeholder written over a redacted value. */
export const DefaultRedactionMask = '[redacted]';

/** Provides the placeholder written where the walk met a value already on the current path. */
export const CircularMarker = '[circular]';

/** Provides the placeholder written where reading a property threw — a getter or a `Proxy` trap. */
export const UnreadableMarker = '[unreadable]';

/** Provides the placeholder written at {@link DefaultMaxRedactDepth} — fail-closed, so nothing below escapes. */
export const TruncatedMarker = '[truncated]';

/** Provides how many levels the walk descends before truncating — deep enough for real context, still bounded. */
export const DefaultMaxRedactDepth = 8;

/**
 * Checks whether a value is a plain object — prototype `Object.prototype` or `null`. `getPrototypeOf` is a
 * trappable operation, so the read is guarded. Internal; not barrelled.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  try {
    const prototype: unknown = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

/** Reads one property without trusting the source — a getter and a `Proxy` `get` trap can both throw. */
function readProperty(source: Record<string, unknown>, key: string): unknown {
  try {
    return source[key];
  } catch {
    return UnreadableMarker;
  }
}

/** Lists a source's own enumerable keys without trusting it — an `ownKeys` trap can throw. */
function readKeys(source: Record<string, unknown>): ReadonlyArray<string> {
  try {
    return Object.keys(source);
  } catch {
    return [];
  }
}

/** Walks one value, copying it with matched keys masked. Recurses only into arrays and plain objects. */
function redactValue(
  value: unknown,
  keys: ReadonlySet<string>,
  mask: string,
  depth: number,
  path: Set<object>,
): unknown {
  if (!Array.isArray(value) && !isPlainObject(value)) return value;

  const container: object = value;
  if (path.has(container)) return CircularMarker;
  if (depth >= DefaultMaxRedactDepth) return TruncatedMarker;

  path.add(container);
  try {
    if (Array.isArray(value)) {
      const items: unknown[] = [];
      // `for…of` over the array itself — indexed access would be `T | undefined` under
      // `noUncheckedIndexedAccess`, and a hole would then be indistinguishable from a stored `undefined`.
      for (const item of value) items.push(redactValue(item, keys, mask, depth + 1, path));
      return items;
    }

    const copy: Record<string, unknown> = {};
    for (const key of readKeys(value)) {
      Object.defineProperty(copy, key, {
        value: keys.has(key.toLowerCase()) ? mask : redactValue(readProperty(value, key), keys, mask, depth + 1, path),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return copy;
  } finally {
    path.delete(container);
  }
}

/**
 * Copies a context object with every value under a matching key replaced by `mask`, at any nesting depth.
 * Key matching is case-insensitive.
 *
 * The result is always a fresh, cycle-free, depth-bounded plain object, so it is safe to `JSON.stringify`
 * and safe to hand to a sink that outlives the call. The source is never mutated.
 *
 * Never throws — a hostile context (throwing getters, `Proxy` traps, self-reference, pathological depth)
 * degrades to markers, and a total failure degrades to `{}`.
 */
export function redactContext(
  context: LogContext,
  redactKeys: ReadonlyArray<string> = DefaultRedactKeys,
  mask: string = DefaultRedactionMask,
): LogContext {
  try {
    const keys = new Set(redactKeys.map((key) => key.toLowerCase()));
    const redacted = redactValue(context, keys, mask, 0, new Set<object>());
    // Non-plain input (a class instance cast to a context) is not walked, so it cannot be proven safe —
    // dropping it keeps the "always a plain, serializable object" guarantee the sinks rely on.
    return isPlainObject(redacted) ? redacted : {};
  } catch {
    return {};
  }
}
