import type { Position } from './Coordinates';
import type { PositionReadResult, PositionStatus } from '../PositionMapping';

/**
 * Where a geolocation consumer sits in its lifecycle: the platform's outcomes, plus the two states that exist
 * only in the UI — `idle` (nothing requested yet) and `locating` (a request is in flight).
 */
export const GeolocationState = {
  /** Nothing has been requested yet — the state before the first read and the one a reset returns to. */
  Idle: 'idle',

  /** A request is in flight; the permission prompt may be open. */
  Locating: 'locating',
} as const;

/** Where a geolocation consumer sits in its lifecycle — the UI-only states plus the platform's outcomes. */
export type GeolocationState = (typeof GeolocationState)[keyof typeof GeolocationState] | PositionStatus;

/** The state both {@link useGeolocation} and {@link useWatchPosition} expose. */
export interface GeolocationReading {
  /** The lifecycle state — drive the whole UI off this one switch. */
  readonly status: GeolocationState;

  /**
   * The most recent successful fix, or `null` before the first one. Deliberately NOT cleared by a later
   * failure — check `status === 'ok'` when only a currently-valid reading will do.
   */
  readonly position: Position | null;

  /** The error behind a `failed` status, or `null` for every other status. Never stale. */
  readonly error: Error | null;
}

/** The starting state: nothing requested, nothing known. */
export const IdleGeolocationReading: GeolocationReading = {
  status: GeolocationState.Idle,
  position: null,
  error: null,
};

/**
 * Folds one {@link PositionReadResult} into the current reading. Pure; exported for the two composables and for tests,
 * absent from the barrel.
 *
 * @param previous The reading being updated — its `position` is what carries a past fix forward.
 * @param result The outcome to apply.
 * @returns The next reading.
 */
export function applyPositionResult(previous: GeolocationReading, result: PositionReadResult): GeolocationReading {
  return {
    status: result.ok ? 'ok' : result.failure.status,
    position: result.ok ? result.value : previous.position,
    error: !result.ok && result.failure.status === 'failed' ? result.failure.error : null,
  };
}
