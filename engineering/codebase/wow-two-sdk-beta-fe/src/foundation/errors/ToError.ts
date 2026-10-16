import { isError, isObjectLike, readMember } from './ErrorLike';

/**
 * Provides the last-resort message used when normalization itself fails — the final rung of the never-throw
 * contract. Internal; not barrelled.
 */
export const UnknownErrorMessage = 'Unknown error';

/**
 * Names a value by its constructor for the unserializable tag — `Object.create(null)` has none, hence the
 * `'value'` floor.
 */
function constructorNameOf(value: object): string {
  const constructor = readMember(value, 'constructor');
  const name = isObjectLike(constructor) ? readMember(constructor, 'name') : undefined;
  return typeof name === 'string' && name !== '' ? name : 'value';
}

/**
 * Renders a value that carries no `message` as message text. Never `'[object Object]'` — the default
 * `String(object)` tag says nothing about the failure — and never a throw: `JSON.stringify` rejects
 * circular structures, `BigInt` members, and a `toJSON` that throws, all of which land on the tagged
 * `[unserializable X]` form instead.
 */
function stringifyUnknown(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  // `String()` is the only coercion that accepts a symbol — a template literal throws a TypeError.
  if (typeof value === 'symbol') return String(value);
  if (typeof value === 'function') {
    const name = readMember(value, 'name');
    return `[Function ${typeof name === 'string' && name !== '' ? name : 'anonymous'}]`;
  }
  // Everything left is either a primitive that stringifies cleanly (number · boolean · bigint) or an object.
  if (!isObjectLike(value)) return String(value);

  try {
    const json = JSON.stringify(value);
    if (typeof json === 'string' && json !== '') return json;
  } catch {
    // Circular reference · BigInt member · throwing `toJSON` — fall through to the tag.
  }
  return `[unserializable ${constructorNameOf(value)}]`;
}

/**
 * Rebuilds an error-like value as a real `Error`, carrying over what it had. `name`, `stack`, and a
 * JSON-safe `code` are preserved so the normalized error still identifies itself (a recognizer keyed
 * on `name` must survive the round trip), and `cause` is preserved so the chain walkers see through
 * the normalization. The adopted `stack` belongs to the original throw site, not to this constructor
 * call — that is the point: the useful frames are the source's.
 */
function adoptErrorLike(source: object, message: string): Error {
  const cause = readMember(source, 'cause');
  // Passing `{ cause: undefined }` installs an own `cause` member — omit the options bag instead.
  const error = (cause === undefined ? new Error(message) : new Error(message, { cause })) as Error & {
    code?: string | number;
  };

  const name = readMember(source, 'name');
  if (typeof name === 'string' && name !== '') error.name = name;

  const stack = readMember(source, 'stack');
  if (typeof stack === 'string' && stack !== '') error.stack = stack;

  const code = readMember(source, 'code');
  if (typeof code === 'string' || typeof code === 'number') error.code = code;

  return error;
}

/**
 * Normalizes any caught value into an `Error` — the first call every `catch` block makes, so that
 * downstream code has one type to reason about instead of `unknown`.
 *
 * An `Error` passes through by identity (no copy, no lost subclass — an `ApiError` stays an
 * `ApiError`); an error-like object is adopted with its `name` / `stack` / `code` / `cause`; a string
 * becomes its own message; anything else is stringified safely. Idempotent from the second call on,
 * since the result is always an `Error`.
 *
 * Total and never-throwing, hostile inputs included: a throwing getter, a `Proxy` whose traps throw,
 * and a circular structure all yield an `Error` rather than a second failure.
 */
export function toError(value: unknown): Error {
  try {
    if (isError(value)) return value;

    if (isObjectLike(value)) {
      const message = readMember(value, 'message');
      if (typeof message === 'string') return adoptErrorLike(value, message);
    }

    return new Error(stringifyUnknown(value));
  } catch {
    return new Error(UnknownErrorMessage);
  }
}
