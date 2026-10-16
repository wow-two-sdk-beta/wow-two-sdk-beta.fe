import {
  computed,
  onScopeDispose,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';

import type { Position } from '../models/Coordinates';
import { getCurrentPosition } from '../GetCurrentPosition';
import {
  applyPositionResult,
  IdleGeolocationReading,
  type GeolocationReading,
  type GeolocationState,
} from '../models/GeolocationReading';
import type { PositionRequestOptions, PositionReadResult } from '../PositionMapping';

/**
 * What {@link useGeolocation} returns — the reactive form of a {@link GeolocationReading} plus the action that
 * refreshes it.
 */
export interface GeolocationControls {
  /** The lifecycle state — drive the whole UI off this one switch. */
  readonly status: ComputedRef<GeolocationState>;

  /**
   * The most recent successful fix, or `null` before the first one. Deliberately NOT cleared by a later
   * failure — check `status.value === 'ok'` when only a currently-valid reading will do.
   */
  readonly position: ComputedRef<Position | null>;

  /** The error behind a `failed` status, or `null` for every other status. Never stale. */
  readonly error: ComputedRef<Error | null>;

  /** Convenience for `status === 'locating'` — the flag a button's `disabled` / spinner wants. */
  readonly locating: ComputedRef<boolean>;

  /**
   * Requests a fix, writing the outcome to this composable's state and also resolving to it. Never throws,
   * never rejects. Call it from a user gesture — it is what raises the permission prompt.
   *
   * @param overrides Options for this call only, replacing the composable-level ones. Omit to use those.
   */
  readonly request: (overrides?: PositionRequestOptions) => Promise<PositionReadResult>;
}

/**
 * Exposes the device's position as reactive state, with a `request()` that fetches it on demand.
 *
 * Requests nothing on mount — see the header for why that is deliberate. Inherits the slice's never-throws
 * contract: `request` resolves to a {@link PositionReadResult}, never rejects.
 *
 * @param options Default tuning for every `request()` call. A ref or getter is read at call time, so the value
 *   in effect is always the current one.
 */
export function useGeolocation(options?: MaybeRefOrGetter<PositionRequestOptions | undefined>): GeolocationControls {
  const reading: ShallowRef<GeolocationReading> = shallowRef(IdleGeolocationReading);

  /** Monotonic request token — only the newest request may write state. See the header. */
  let latestRequest = 0;
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
    latestRequest++;
  });

  const request = async (overrides?: PositionRequestOptions): Promise<PositionReadResult> => {
    if (disposed) return { ok: false, failure: { status: 'unsupported' } };
    latestRequest += 1;
    const token = latestRequest;

    reading.value = { ...reading.value, status: 'locating' };

    const result = await getCurrentPosition(overrides ?? toValue(options));

    if (token === latestRequest) reading.value = applyPositionResult(reading.value, result);
    return result;
  };

  return {
    status: computed(() => reading.value.status),
    position: computed(() => reading.value.position),
    error: computed(() => reading.value.error),
    locating: computed(() => reading.value.status === 'locating'),
    request,
  };
}
