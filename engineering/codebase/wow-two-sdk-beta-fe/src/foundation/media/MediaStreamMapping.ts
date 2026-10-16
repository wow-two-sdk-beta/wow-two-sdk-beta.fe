import type { MediaStreamFailure } from './models/MediaStreamFailure';

import { toError } from '../errors';
export type { MediaStreamFailure } from './models/MediaStreamFailure';
export type { MediaStreamRequestResult } from './models/MediaStreamRequestResult';

export type MediaStreamStatus = 'granted' | MediaStreamFailure['status'];

/** Every {@link MediaStreamRequestResult} arm except the successful one — what a rejected `getUserMedia` can become. */

/**
 * Reads a caught value's `name` as a string. Guarded: a throwing getter or a `Proxy` trap reads as absent rather
 * than escalating into a second failure inside the `catch` that is already handling the first.
 */
function nameOf(value: unknown): string | undefined {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return undefined;

  try {
    const name: unknown = (value as Record<string, unknown>)['name'];
    return typeof name === 'string' ? name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Classifies a rejected `getUserMedia` into its {@link MediaStreamFailure}.
 *
 * Exported for the sibling request modules and their tests; absent from the barrel, where the request functions
 * are the surface a consumer wants. Never throws — an unrecognized name falls through to `failed` with the value
 * normalized by `foundation/errors`' `toError`, so even a thrown `null` arrives as a real `Error`.
 *
 * @param cause The value `getUserMedia` rejected (or threw) with.
 * @returns The matching failure arm.
 */
export function toMediaStreamFailure(cause: unknown): MediaStreamFailure {
  switch (nameOf(cause)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return { status: 'denied' };

    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { status: 'unavailable' };

    case 'NotReadableError':
    case 'TrackStartError':
      return { status: 'in-use' };

    default:
      return { status: 'failed', error: toError(cause) };
  }
}
