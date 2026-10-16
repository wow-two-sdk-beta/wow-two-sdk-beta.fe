/**
 * Defines the structural shape every helper in this slice accepts — anything carrying a string
 * `message`. Deliberately structural rather than `Error`: a value crossing a realm boundary
 * (iframe, worker, `structuredClone`), rehydrated from JSON, or built by a library that never
 * subclassed `Error` all fail `instanceof` while still being perfectly usable errors.
 */
export interface ErrorLike {
  /** The human-readable failure description — the one member that makes a value error-like. */
  readonly message: string;

  /** The error kind — `'TypeError'`, `'AbortError'`, a custom tag. Absent on hand-rolled shapes. */
  readonly name?: string;

  /** The captured stack trace, when the source recorded one. */
  readonly stack?: string;

  /** The machine-readable code — Node's `'ETIMEDOUT'`, a legacy `DOMException` number, an app code. */
  readonly code?: string | number;

  /** The underlying failure this one wraps (the standard ES2022 `cause`). Untyped — anything can be thrown. */
  readonly cause?: unknown;
}

/**
 * Checks whether a value can carry properties at all — `typeof null` is `'object'`, and a function
 * is a legal throw target. Internal; not barrelled.
 */
export function isObjectLike(value: unknown): value is object {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

/**
 * Reads a property without trusting the source. A getter can throw and a `Proxy` `get` trap can
 * throw, so an unguarded read would turn error handling into a second failure. Internal; not barrelled.
 */
export function readMember(source: object, key: string): unknown {
  try {
    return (source as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

/**
 * Checks `instanceof Error` without trusting the value — `instanceof` invokes `getPrototypeOf`,
 * which a `Proxy` trap can throw from. Internal; not barrelled.
 */
export function isError(value: unknown): value is Error {
  try {
    return value instanceof Error;
  } catch {
    return false;
  }
}

/** Checks whether a value is structurally an {@link ErrorLike} — an object or function with a string `message`. */
export function isErrorLike(value: unknown): value is ErrorLike {
  return isObjectLike(value) && typeof readMember(value, 'message') === 'string';
}
