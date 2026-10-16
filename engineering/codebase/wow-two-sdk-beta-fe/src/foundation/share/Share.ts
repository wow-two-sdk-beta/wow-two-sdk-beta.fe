import type { ShareSendResult } from './models/ShareSendResult';
import type { ShareFailure } from './models/ShareFailure';

import { isAbortError, toError } from '../errors';

import { canShare } from './CanShare';
import { toNativeSharePayload, type ShareData } from './ShareData';
export type { ShareFailure } from './models/ShareFailure';
export type { ShareSendResult } from './models/ShareSendResult';
export type ShareStatus = 'shared' | ShareFailure['status'];

/** Tunes a share attempt. */
export interface ShareOptions {
  /**
   * Called with the normalized error on a `failed` result — the seam for a toast or telemetry hook. Never called
   * for `dismissed` or `unsupported`, neither of which is a failure. A throw from this callback is swallowed.
   */
  readonly onError?: (error: Error) => void;
}

/**
 * Hands a consumer's callback the failure, absorbing a throw from the callback itself. A reporter that throws
 * must not convert a typed result into an unhandled rejection. Exported for the sibling fallback module; absent
 * from the barrel.
 */
export function reportShareError(onError: ShareOptions['onError'], error: Error): void {
  if (onError === undefined) return;
  try {
    onError(error);
  } catch {
    // The consumer's own reporter failed. There is nothing useful left to do with that — the result still
    // reaches the caller, which is the guarantee that matters.
  }
}

/**
 * Opens the native share sheet for `data` and resolves to a {@link ShareSendResult}.
 *
 * Call it from a user gesture: browsers require transient activation for the sheet, and without one the platform
 * rejects — which surfaces as `failed`, not `unsupported`, since the API was in fact present.
 *
 * Never throws, never rejects.
 */
export async function share(data: ShareData, options?: ShareOptions): Promise<ShareSendResult> {
  if (!canShare(data)) return { ok: false, failure: { status: 'unsupported' } };

  try {
    await navigator.share(toNativeSharePayload(data));
    return { ok: true, value: undefined };
  } catch (error) {
    // The user's own decision ends the flow quietly — no `onError`, no fallback downstream.
    if (isAbortError(error)) return { ok: false, failure: { status: 'dismissed' } };

    const failure = toError(error);
    reportShareError(options?.onError, failure);
    return { ok: false, failure: { status: 'failed', error: failure } };
  }
}
