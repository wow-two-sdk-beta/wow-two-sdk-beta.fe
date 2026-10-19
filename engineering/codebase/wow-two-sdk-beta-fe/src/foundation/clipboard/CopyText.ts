import {
  reportClipboardOutcome,
  toClipboardFailure,
  type ClipboardCopyOptions,
  type ClipboardWriteResult,
} from './ClipboardResult';
import { canCopy, clipboardMethod } from './ClipboardSupport';
import { withLegacyFallback } from './LegacyCopy';

/** The write outcome when the engine has no Clipboard API to try. */
const UnsupportedWrite: ClipboardWriteResult = { ok: false, failure: { status: 'unsupported' } };

/** Runs the Clipboard API write, mapping every outcome onto the result union. Never throws. */
async function writeTextThroughApi(text: string): Promise<ClipboardWriteResult> {
  const writeText = clipboardMethod('writeText');
  if (writeText === undefined) return { ok: false, failure: { status: 'unsupported' } };

  try {
    await writeText(text);
    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, failure: toClipboardFailure(error) };
  }
}

/**
 * Writes `text` to the system clipboard.
 *
 * Call it from a user gesture: browsers require transient activation for a clipboard write, and without one the
 * platform refuses — which surfaces as `denied`, not `unsupported`, since the API was in fact present.
 *
 * Resolves to `unsupported` under SSR, in a non-secure context, and on engines with no Clipboard API. Pass
 * `legacyFallback: true` to retry those through the deprecated `document.execCommand` path.
 *
 * Never throws, never rejects.
 *
 * @param text The text to place on the clipboard. An empty string is a valid payload — it clears the clipboard.
 * @param options Error reporting and the legacy-fallback opt-in.
 */
export async function copyText(text: string, options?: ClipboardCopyOptions): Promise<ClipboardWriteResult> {
  try {
    if (typeof text !== 'string') {
      return reportClipboardOutcome(
        { ok: false, failure: { status: 'failed', error: new TypeError('copyText expects a string.') } } as const,
        options?.onError,
      );
    }

    // With no Clipboard API there is nothing to await: the legacy copy runs in the same tick as the click, which
    // is the only window older Safari and a non-secure context grant it.
    const modern = canCopy() ? await writeTextThroughApi(text) : UnsupportedWrite;
    const result = withLegacyFallback(modern, text, options);
    return reportClipboardOutcome(result, options?.onError);
  } catch (error) {
    // Unreachable by design — every helper above is itself total. Kept so a future edit to one of them cannot
    // turn this entry point into a rejecting promise.
    return reportClipboardOutcome({ ok: false, failure: toClipboardFailure(error) }, options?.onError);
  }
}
