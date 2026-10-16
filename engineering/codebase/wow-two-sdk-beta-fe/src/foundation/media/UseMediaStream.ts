import { onScopeDispose, shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import type { MediaStreamRequestResult, MediaStreamStatus } from './MediaStreamMapping';
import { requestMediaStream } from './RequestMediaStream';
import { stopMediaStream } from './StopMediaStream';

/**
 * Where a `useMediaStream` instance sits in its cycle: `idle` before the first attempt and after `stop`,
 * `pending` while the browser prompt is open, then the {@link MediaStreamStatus} of the last attempt.
 */
export const MediaStreamState = {
  /** Before the first attempt, and after `stop` — nothing acquired, nothing in flight. */
  Idle: 'idle',

  /** An acquisition is in flight; the browser's permission prompt may be open. */
  Pending: 'pending',
} as const;

/**
 * Where a `useMediaStream` instance sits in its cycle: `idle` before the first attempt and after `stop`,
 * `pending` while the browser prompt is open, then the {@link MediaStreamStatus} of the last attempt.
 */
export type MediaStreamState = (typeof MediaStreamState)[keyof typeof MediaStreamState] | MediaStreamStatus;

/** Tunes a `useMediaStream` instance. */
export interface UseMediaStreamOptions {
  /** Constraints for every `start()` not passing its own. Default `{ video: true }` — camera, no microphone. */
  readonly constraints?: MediaStreamConstraints;
}

/** What {@link useMediaStream} returns. */
export interface MediaStreamControls {
  /** The current state — drives the button label, the spinner, and the permission-denied copy. */
  readonly status: Readonly<ShallowRef<MediaStreamState>>;

  /** The live stream, or `null` whenever `status` is anything but `granted`. Assign to a `<video>`'s `srcObject`. */
  readonly stream: Readonly<ShallowRef<MediaStream | null>>;

  /**
   * The normalized error from a `failed` attempt; `null` for every other status, including `denied`, which is a
   * decision rather than a failure.
   */
  readonly error: Readonly<ShallowRef<Error | null>>;

  /** Acquires a stream, releasing any currently held one first. Resolves to the outcome; never throws. */
  readonly start: (constraints?: MediaStreamConstraints) => Promise<MediaStreamRequestResult>;

  /** Releases the held stream and returns to `idle`. Idempotent, safe before the first `start`. */
  readonly stop: () => void;
}

/**
 * The camera-only default — matching `requestCameraStream`, so an unconfigured composable does not silently
 * open the microphone.
 */
const DefaultConstraints: MediaStreamConstraints = { video: true };

/**
 * Acquires and owns a media stream, releasing it on `stop` and when the scope is disposed.
 *
 * ```vue
 * const camera = useMediaStream();
 * <video ref="videoEl" autoplay playsinline muted />
 * <button @click="camera.start()">Start</button>
 * // watchEffect(() => { if (videoEl.value) videoEl.value.srcObject = camera.stream.value; })
 * ```
 *
 * Inherits the slice's never-throws contract — a rejected promise is not one of the outcomes.
 *
 * @param options Default constraints for `start()`. A ref or getter is read at call time.
 * @returns The state machine plus the two lifecycle callbacks.
 */
export function useMediaStream(options?: MaybeRefOrGetter<UseMediaStreamOptions | undefined>): MediaStreamControls {
  const status = shallowRef<MediaStreamState>(MediaStreamState.Idle);
  const stream = shallowRef<MediaStream | null>(null);
  const error = shallowRef<Error | null>(null);

  let held: MediaStream | null = null;
  let disposed = false;
  let generation = 0;

  /** Releases the held stream and clears the handle. The one place tracks are stopped, so every path funnels here. */
  function release(): void {
    stopMediaStream(held);
    held = null;
  }

  const stop = (): void => {
    generation++;
    release();
    if (disposed) return;
    stream.value = null;
    status.value = MediaStreamState.Idle;
    error.value = null;
  };

  const start = async (constraints?: MediaStreamConstraints): Promise<MediaStreamRequestResult> => {
    const operation = ++generation;
    if (disposed) return { ok: false, failure: { status: 'cancelled' } };
    // Release before acquiring, never after: most phones cannot open two cameras at once, so an overlapping
    // acquisition fails with `NotReadableError` — and on the devices where it succeeds it leaves the first
    // camera live. Same ordering, same reason, as `switchCamera`.
    release();
    if (!disposed) {
      stream.value = null;
      error.value = null;
      status.value = MediaStreamState.Pending;
    }

    const result = await requestMediaStream(constraints ?? toValue(options)?.constraints ?? DefaultConstraints);

    if (disposed || operation !== generation) {
      // Torn down while the prompt was open. The stream arrived for a component that no longer exists; nothing
      // else will ever reach it, so it is released here or the device stays held for the life of the tab.
      if (result.ok) stopMediaStream(result.value);
      return { ok: false, failure: { status: 'cancelled' } };
    }

    if (result.ok) {
      held = result.value;
      stream.value = result.value;
    }
    status.value = result.ok ? 'granted' : result.failure.status;
    error.value = !result.ok && result.failure.status === 'failed' ? result.failure.error : null;

    return result;
  };

  onScopeDispose(() => {
    disposed = true;
    release();
  });

  return { status, stream, error, start, stop };
}
