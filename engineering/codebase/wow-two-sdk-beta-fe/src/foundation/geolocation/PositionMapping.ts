import type { PositionReadResult } from './models/PositionReadResult';
import type { PositionFailure } from './models/PositionFailure';

import { toError } from '../errors';

import { toPosition } from './models/Coordinates';

/** `GeolocationPositionError.PERMISSION_DENIED` — the user or a policy refused. */
const PermissionDeniedCode = 1;

/** `GeolocationPositionError.POSITION_UNAVAILABLE` — allowed, but no fix could be acquired. */
const PositionUnavailableCode = 2;

/** `GeolocationPositionError.TIMEOUT` — allowed, but the fix did not arrive inside the timeout budget. */
const TimeoutCode = 3;

/** The message on the `Error` reported when the platform hands back a position nothing can be read out of. */
export const UnreadablePositionMessage = 'Geolocation reported a position with no readable coordinates.';
export type { PositionFailure } from './models/PositionFailure';
export type { PositionReadResult } from './models/PositionReadResult';
export type PositionStatus = 'ok' | PositionFailure['status'];

/**
 * Tunes a position request. Mirrors the platform's `PositionOptions`, restated here so the public API of this
 * slice owns its own input type and can document what each field actually costs.
 */
export interface PositionRequestOptions {
  /**
   * Asks for the most accurate fix the device can give — GPS rather than wifi/cell triangulation. Slower to
   * acquire and materially more battery-hungry; leave it off unless the accuracy genuinely changes the UI.
   */
  readonly enableHighAccuracy?: boolean;

  /**
   * Milliseconds to wait for a fix before answering `timeout`. Unset means wait indefinitely — which is why a
   * request with no timeout can leave a UI spinning forever indoors. A cold GPS fix can need 10–30s.
   */
  readonly timeout?: number;

  /**
   * Milliseconds a cached fix may be old and still be handed back instantly. `0` (the platform default) forces
   * a fresh acquisition every time; a few seconds is usually a better trade for a UI that asks repeatedly.
   */
  readonly maximumAge?: number;
}

/**
 * Reads the numeric `code` off a value of unknown provenance. Returns `null` for a missing or non-numeric code
 * and for an accessor that throws — a platform error object is read inside a callback, where an exception
 * cannot be caught by the original caller.
 */
function readErrorCode(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null) return null;
  try {
    const code: unknown = (raw as Record<string, unknown>).code;
    return typeof code === 'number' ? code : null;
  } catch {
    return null;
  }
}

/**
 * Translates a value from a geolocation error callback into its {@link PositionReadResult}. Exported for the two
 * sibling entry points; absent from the barrel.
 *
 * Never throws — a hostile error object degrades to `failed`, never to an exception thrown inside a platform
 * callback.
 *
 * @param raw The value handed to a `getCurrentPosition` / `watchPosition` error callback.
 */
export function toPositionResult(raw: unknown): PositionReadResult {
  switch (readErrorCode(raw)) {
    case PermissionDeniedCode:
      return { ok: false, failure: { status: 'denied' } };
    case PositionUnavailableCode:
      return { ok: false, failure: { status: 'unavailable' } };
    case TimeoutCode:
      return { ok: false, failure: { status: 'timeout' } };
    default:
      return { ok: false, failure: { status: 'failed', error: toError(raw) } };
  }
}

/**
 * Translates a value from a geolocation success callback into its {@link PositionReadResult}, converting the host
 * object into a plain snapshot on the way. Exported for the two sibling entry points; absent from the barrel.
 *
 * A success callback that carries nothing readable becomes `failed` rather than `ok` with a hollow position —
 * a consumer must never receive a `status: 'ok'` it cannot plot.
 *
 * Never throws.
 *
 * @param raw The value handed to a `getCurrentPosition` / `watchPosition` success callback.
 */
export function toPositionSuccess(raw: unknown): PositionReadResult {
  const position = toPosition(raw);
  if (position === null)
    return { ok: false, failure: { status: 'failed', error: new Error(UnreadablePositionMessage) } };
  return { ok: true, value: position };
}
