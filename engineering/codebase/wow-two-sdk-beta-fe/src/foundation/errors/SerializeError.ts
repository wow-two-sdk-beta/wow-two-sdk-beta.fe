import { DefaultMaxCauseDepth, flattenErrorChain } from './ErrorChain';
import { readMember } from './ErrorLike';
import { UnknownErrorMessage } from './ToError';

/**
 * Defines the JSON-safe projection of an error produced by {@link serializeError}. Every member is a plain
 * value — no getters, no prototype, no cycles.
 */
export interface SerializedError {
  /** The error kind — the source's `name`, or `'Error'` when it had none. */
  readonly name: string;

  /** The failure description — the source's `message`, or `''` when it had none (a log record, not UI copy). */
  readonly message: string;

  /** The captured stack trace. Omitted when the source had none. */
  readonly stack?: string;

  /**
   * The machine-readable code. Omitted unless the source carried a string or number `code` — other types are
   * dropped to keep the payload JSON-safe.
   */
  readonly code?: string | number;

  /**
   * The serialized underlying failure. Omitted at the root of the chain, and wherever the depth cap or a cycle
   * stopped the walk.
   */
  readonly cause?: SerializedError;
}

/** Projects one normalized link, hanging the already-serialized inner link off it. */
function projectLink(error: Error, cause: SerializedError | undefined): SerializedError {
  const name = readMember(error, 'name');
  const message = readMember(error, 'message');
  const stack = readMember(error, 'stack');
  const code = readMember(error, 'code');

  return {
    name: typeof name === 'string' && name !== '' ? name : 'Error',
    message: typeof message === 'string' ? message : '',
    ...(typeof stack === 'string' && stack !== '' ? { stack } : {}),
    ...(typeof code === 'string' || typeof code === 'number' ? { code } : {}),
    ...(cause !== undefined ? { cause } : {}),
  };
}

/**
 * Projects any caught value into a plain object safe to hand a logger or a telemetry sink — an `Error`
 * serializes to `{}` through `JSON.stringify`, because `name` / `message` / `stack` are all
 * non-enumerable, so anything that ships errors off the device needs this first.
 *
 * The `cause` chain nests, inheriting the walk's cycle protection and depth cap, so a circular
 * `cause` produces a finite tree rather than a `JSON.stringify` overflow. Non-JSON-safe members are
 * dropped, not coerced: the result always survives `JSON.stringify`.
 *
 * Never throws.
 */
export function serializeError(error: unknown, maxDepth: number = DefaultMaxCauseDepth): SerializedError {
  try {
    let serialized: SerializedError | undefined;
    // Fold from the root back to the head, so each link is built with its inner one already done.
    for (const link of [...flattenErrorChain(error, maxDepth)].reverse()) {
      serialized = projectLink(link, serialized);
    }
    // `flattenErrorChain` is non-empty by contract; the fallback keeps the return type honest.
    return serialized ?? { name: 'Error', message: UnknownErrorMessage };
  } catch {
    return { name: 'Error', message: UnknownErrorMessage };
  }
}
