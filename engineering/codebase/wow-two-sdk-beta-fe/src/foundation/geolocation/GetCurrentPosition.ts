import { toError } from '../errors';

import { geolocationApi } from './CanLocate';
import {
  toPositionResult,
  toPositionSuccess,
  type PositionRequestOptions,
  type PositionReadResult,
} from './PositionMapping';

/**
 * Reads the device's current position once.
 *
 * The first call from an origin triggers the browser's permission prompt, so call it from a user gesture: a
 * prompt with no visible cause is the one users reflexively dismiss, and a dismissal is a `denied` that sticks.
 *
 * Never throws, never rejects — every outcome, including the absence of the API, arrives as a
 * {@link PositionReadResult}.
 *
 * @param options Accuracy / timeout / cache-age tuning. See {@link PositionRequestOptions}.
 * @returns The outcome: a fix, a typed refusal (`denied` / `unavailable` / `timeout`), `unsupported`, or `failed`.
 */
export function getCurrentPosition(options?: PositionRequestOptions): Promise<PositionReadResult> {
  const api = geolocationApi();
  if (api === undefined) return Promise.resolve({ ok: false, failure: { status: 'unsupported' } });

  return new Promise<PositionReadResult>((resolve) => {
    let settled = false;

    /** Resolves with the first answer and ignores every later one. See the header. */
    const settle = (result: PositionReadResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      api.getCurrentPosition(
        (raw) => settle(toPositionSuccess(raw)),
        (error) => settle(toPositionResult(error)),
        options,
      );
    } catch (error) {
      // A synchronous throw from the platform call itself — an insecure context on some engines, a stand-in
      // with the wrong arity. The API was present, so this is `failed`, not `unsupported`.
      settle({ ok: false, failure: { status: 'failed', error: toError(error) } });
    }
  });
}
