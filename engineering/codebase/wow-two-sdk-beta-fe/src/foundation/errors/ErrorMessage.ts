import { isObjectLike, readMember } from './ErrorLike';

/** Provides the message shown when a caught value carries nothing readable. Also the floor for a blank fallback. */
export const DefaultErrorMessage = 'Something went wrong';

/**
 * Accepts a candidate only if it is text worth showing — trimmed, non-blank, and not the
 * `'[object Object]'` tag an upstream `String(object)` may already have baked into a message.
 */
function usableMessage(candidate: unknown): string | undefined {
  if (typeof candidate !== 'string') return undefined;
  const trimmed = candidate.trim();
  if (trimmed === '' || trimmed === '[object Object]') return undefined;
  return trimmed;
}

/**
 * Extracts the message a UI can show for a caught value — the string itself, or its `message` member.
 *
 * Narrower than `toError` on purpose. `toError` is total and must produce *some* `Error`, so it
 * stringifies whatever it gets; this returns UI copy, so a value with no message (a bare number, `{}`,
 * a JSON blob, `null`) yields `fallback` rather than rendering machine noise into a toast. Guaranteed
 * never to return `''` or `'[object Object]'` — a blank `fallback` degrades to {@link DefaultErrorMessage}.
 *
 * Never throws: a `message` getter that throws reads as absent.
 */
export function getErrorMessage(value: unknown, fallback: string = DefaultErrorMessage): string {
  try {
    const direct = usableMessage(value);
    if (direct !== undefined) return direct;

    if (isObjectLike(value)) {
      const message = usableMessage(readMember(value, 'message'));
      if (message !== undefined) return message;
    }

    return usableMessage(fallback) ?? DefaultErrorMessage;
  } catch {
    return DefaultErrorMessage;
  }
}
