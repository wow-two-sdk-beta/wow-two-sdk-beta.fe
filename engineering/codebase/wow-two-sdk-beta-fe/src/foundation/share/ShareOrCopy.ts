import type { ShareSendOrCopyResult } from './models/ShareSendOrCopyResult';

import { toError } from '../errors';

import { reportShareError, share, type ShareOptions, type ShareFailure } from './Share';
import { shareFallbackText, type ShareData } from './ShareData';
export type { ShareSendOrCopyResult } from './models/ShareSendOrCopyResult';

/** The `status` discriminant of a {@link ShareSendOrCopyResult}. */
export type ShareOrCopyStatus = 'shared' | 'copied' | ShareFailure['status'];

/** Tunes a share-with-fallback attempt. */
export interface ShareOrCopyOptions extends ShareOptions {
  /**
   * Whether an `unsupported` share degrades to a clipboard copy. Defaults to `true`; pass `false` to keep the
   * `unsupported` result and render your own affordance instead (an explicit copy button, a mailto link).
   */
  readonly fallbackToCopy?: boolean;
}

/** Writes `text` to the system clipboard, mapping the outcome onto the share result vocabulary. Never throws. */
async function copyToClipboard(text: string, options?: ShareOptions): Promise<ShareSendOrCopyResult> {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
      return { ok: false, failure: { status: 'unsupported' } };
    }

    await navigator.clipboard.writeText(text);
    return { ok: true, value: 'copied' };
  } catch (error) {
    // A rejected write is a real failure (denied permission, insecure context): the user asked to share and
    // nothing reached them. Reported rather than quietly downgraded to `unsupported`.
    const failure = toError(error);
    reportShareError(options?.onError, failure);
    return { ok: false, failure: { status: 'failed', error: failure } };
  }
}

/**
 * Shares `data` natively, falling back to a clipboard copy of its `shareFallbackText` when there is no Web Share
 * API. Resolves to `copied` when the fallback ran.
 *
 * Falls back on `unsupported` only — `shared` / `dismissed` / `failed` pass straight through. Stays
 * `unsupported` when `fallbackToCopy` is `false`, when the payload has no copyable text (files only), or when
 * the clipboard is unavailable too.
 *
 * Never throws, never rejects.
 */
export async function shareOrCopy(data: ShareData, options?: ShareOrCopyOptions): Promise<ShareSendOrCopyResult> {
  const result = await share(data, options);
  if (result.ok) return { ok: true, value: 'shared' };
  if (result.failure.status !== 'unsupported') return result;
  if (options?.fallbackToCopy === false) return result;

  const text = shareFallbackText(data);
  if (text === undefined) return result;

  return copyToClipboard(text, options);
}
