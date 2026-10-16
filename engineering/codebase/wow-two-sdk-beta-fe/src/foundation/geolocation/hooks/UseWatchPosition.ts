import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import { applyPositionResult, IdleGeolocationReading, type GeolocationReading } from '../models/GeolocationReading';
import type { PositionRequestOptions } from '../PositionMapping';
import { watchPosition } from '../WatchPosition';

/**
 * Tracks the device's position for as long as the scope lives, clearing the watch when it is disposed.
 *
 * Starts on mount — see the header. Every fix and every failure arrives through the same
 * {@link GeolocationReading} shape `useGeolocation` exposes, minus the manual `request`; the last successful
 * fix survives a later failure, so a map keeps its pin when the signal drops.
 *
 * Inherits the slice's never-throws contract.
 *
 * @param options Accuracy / timeout / cache-age tuning. Changing any of the three values restarts the watch.
 * @returns The current reading. Holds {@link IdleGeolocationReading} during SSR and until mount.
 */
export function useWatchPosition(
  options?: MaybeRefOrGetter<PositionRequestOptions | undefined>,
): Readonly<ShallowRef<GeolocationReading>> {
  const reading: ShallowRef<GeolocationReading> = shallowRef(IdleGeolocationReading);

  let dispose: (() => void) | undefined;

  function stop(): void {
    dispose?.();
    dispose = undefined;
  }

  function start(): void {
    stop();
    reading.value = { ...reading.value, status: 'locating' };

    const resolved = toValue(options);
    dispose = watchPosition(
      (result) => {
        reading.value = applyPositionResult(reading.value, result);
      },
      {
        enableHighAccuracy: resolved?.enableHighAccuracy,
        timeout: resolved?.timeout,
        maximumAge: resolved?.maximumAge,
      },
    );
  }

  onMounted(start);
  // Non-immediate on purpose: an immediate watcher runs on the server, where `navigator` is absent. Three
  // separate getters rather than one returning a tuple — Vue compares each source with `Object.is`, so an
  // options object of a fresh identity carrying the same three values does not restart the watch.
  watch(
    [() => toValue(options)?.enableHighAccuracy, () => toValue(options)?.timeout, () => toValue(options)?.maximumAge],
    start,
  );
  onScopeDispose(stop);

  return reading;
}
