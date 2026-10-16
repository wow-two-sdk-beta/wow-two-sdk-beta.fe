import { toError } from '../errors';

import { geolocationApi } from './CanLocate';
import {
  toPositionResult,
  toPositionSuccess,
  type PositionRequestOptions,
  type PositionReadResult,
} from './PositionMapping';

/** Receives every emission of a watch — a new fix, or a failure. Called with the same union as a one-shot read. */
export type PositionHandler = (result: PositionReadResult) => void;

/**
 * Subscribes to the device's position and calls `handler` on every fix and every failure.
 *
 * Unlike {@link getCurrentPosition}, a watch does not end: it keeps reporting until disposed, which is why the
 * return value is the disposer. **Always call it** — in a watcher's `onCleanup`, on route change, when the
 * feature is toggled off. A live watch holds the location hardware on.
 *
 * Emits `unsupported` once, synchronously, where there is no Geolocation API, then never again.
 *
 * Never throws — neither this call nor any emission.
 *
 * @param handler Called with each {@link PositionReadResult}. A throw from it is swallowed.
 * @param options Accuracy / timeout / cache-age tuning. See {@link PositionRequestOptions}.
 * @returns The disposer. Idempotent; safe to call more than once and after emissions have stopped.
 */
export function watchPosition(handler: PositionHandler, options?: PositionRequestOptions): () => void {
  let disposed = false;
  let watchId: number | undefined;

  /** Hands the subscriber a result, absorbing a throw from their own handler and ignoring post-dispose noise. */
  const emit = (result: PositionReadResult): void => {
    if (disposed) return;
    try {
      handler(result);
    } catch {
      // The subscriber's handler failed. Their problem, and not a reason to break the subscription or to let an
      // exception escape into a platform callback, where nothing can catch it.
    }
  };

  const api = geolocationApi();
  if (api === undefined || typeof api.watchPosition !== 'function') {
    emit({ ok: false, failure: { status: 'unsupported' } });
    return () => {
      disposed = true;
    };
  }

  try {
    const id: unknown = api.watchPosition(
      (raw) => emit(toPositionSuccess(raw)),
      (error) => emit(toPositionResult(error)),
      options,
    );
    // A spec-conformant implementation returns a number. Anything else is kept out of `watchId` so the disposer
    // never hands `clearWatch` a value it cannot act on.
    if (typeof id === 'number') watchId = id;
  } catch (error) {
    emit({ ok: false, failure: { status: 'failed', error: toError(error) } });
  }

  return () => {
    if (disposed) return;
    disposed = true;

    if (watchId === undefined) return;
    const id = watchId;
    // Cleared before the call, so a throwing `clearWatch` cannot leave the disposer able to fire it twice.
    watchId = undefined;

    try {
      if (typeof api.clearWatch === 'function') api.clearWatch(id);
    } catch {
      // A stand-in without a working `clearWatch`. Nothing further to do — the flag already stopped emissions.
    }
  };
}
