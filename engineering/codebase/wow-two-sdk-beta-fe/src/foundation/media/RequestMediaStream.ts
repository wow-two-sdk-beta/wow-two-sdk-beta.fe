import { mediaDevicesWith } from './CanCaptureMedia';
import { toMediaStreamFailure, type MediaStreamRequestResult } from './MediaStreamMapping';

/**
 * Requests a stream for arbitrary constraints — the general form the camera / microphone helpers delegate to.
 *
 * Call it from a user gesture where possible: some engines require transient activation, and browsers rate-limit
 * repeated prompts. A `granted` result transfers stream ownership to the caller.
 *
 * Never throws, never rejects.
 *
 * @param constraints The `MediaStreamConstraints` to pass through, e.g. `{ video: true, audio: true }`.
 * @returns The typed outcome — `granted` carrying the live stream, or one of the five failure arms.
 */
export async function requestMediaStream(constraints: MediaStreamConstraints): Promise<MediaStreamRequestResult> {
  const devices = mediaDevicesWith('getUserMedia');
  if (devices === undefined) return { ok: false, failure: { status: 'unsupported' } };

  try {
    const stream: unknown = await devices.getUserMedia(constraints);

    // The DOM types promise a `MediaStream`; a polyfill or a test double can resolve with anything. Letting a
    // non-object through as `granted` would move the failure into the consumer's `stream.getTracks()`, far from
    // its cause — so an off-spec resolve is a `failed` result here, where the context still exists.
    if (typeof stream !== 'object' || stream === null) {
      return {
        ok: false,
        failure: { status: 'failed', error: new Error('getUserMedia resolved without a MediaStream') },
      };
    }

    return { ok: true, value: stream as MediaStream };
  } catch (cause) {
    return { ok: false, failure: toMediaStreamFailure(cause) };
  }
}

/**
 * Requests a camera-only stream.
 *
 * Video only, deliberately: a "camera" request that also opened the microphone would widen the permission
 * prompt (browsers name every device being asked for) and capture audio the caller never asked for. Pass
 * `{ video: …, audio: true }` to {@link requestMediaStream} when both are genuinely wanted.
 *
 * Never throws, never rejects.
 *
 * @param constraints Track constraints for the video device — resolution, `deviceId`, `facingMode`. Omitted
 *   means `video: true`: whichever camera the browser prefers.
 * @returns The typed outcome.
 */
export function requestCameraStream(constraints?: MediaTrackConstraints): Promise<MediaStreamRequestResult> {
  return requestMediaStream({ video: constraints ?? true });
}

/**
 * Requests a microphone-only stream.
 *
 * Never throws, never rejects.
 *
 * @param constraints Track constraints for the audio device — `deviceId`, `echoCancellation`, `noiseSuppression`.
 *   Omitted means `audio: true`.
 * @returns The typed outcome.
 */
export function requestMicrophoneStream(constraints?: MediaTrackConstraints): Promise<MediaStreamRequestResult> {
  return requestMediaStream({ audio: constraints ?? true });
}
