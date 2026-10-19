import { onScopeDispose, shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { copyText } from '../CopyText';
import type { ClipboardWriteResult } from '../ClipboardResult';

export interface UseClipboardOptions {
  /** Reset `copied` and `error` after this many ms. Default 2000. Set 0 to keep state until explicitly reset. */
  resetAfter?: MaybeRefOrGetter<number>;

  /**
   * Whether a write the Clipboard API cannot complete retries through the legacy `document.execCommand('copy')`
   * path. Default `true`: a copy button that does nothing in a non-secure context, an embedded webview or a
   * browser that refuses the write is worse than the deprecated path. Pass `false` to stay on the standard API.
   */
  legacyFallback?: boolean;
}

export interface ClipboardControls {
  /** True for `resetAfter` ms after a successful copy. */
  copied: Readonly<ShallowRef<boolean>>;

  /** The last failed copy's error, held for the `resetAfter` window (or until the next copy or `reset`). */
  error: Readonly<ShallowRef<Error | null>>;

  /**
   * Writes text and returns the completed success or failure to the caller. Pass the element that triggered the
   * copy as `anchor` so the legacy fallback stays inside that element's dialog.
   */
  copy: (text: string, anchor?: Element | null) => Promise<ClipboardWriteResult>;

  /** Force-clear the `copied` flag. */
  reset: () => void;
}

/**
 * Wraps `navigator.clipboard.writeText` with transient `copied` and `error` flags for
 * post-action UI (icon swap, "Copied!" tooltip, failure state). The write falls back to
 * `document.execCommand('copy')` when the Clipboard API is missing or refuses it. Pass
 * `resetAfter: 0` to keep the state until you call `reset()`.
 *
 * `resetAfter` may be a ref or getter; it is read at copy time, so a window
 * changed between copies takes effect on the next one.
 */
export function useClipboard({
  resetAfter = 2000,
  legacyFallback = true,
}: UseClipboardOptions = {}): ClipboardControls {
  const copied = shallowRef(false);
  const error = shallowRef<Error | null>(null);
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let disposed = false;

  const reset = (): void => {
    generation++;
    if (timeout) clearTimeout(timeout);
    timeout = null;
    copied.value = false;
    error.value = null;
  };

  /** Clears the state once the window passes; a window of 0 holds it. */
  const settleAfter = (window: number): void => {
    if (window <= 0) return;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      copied.value = false;
      error.value = null;
    }, window);
  };

  const copy = async (text: string, anchor?: Element | null): Promise<ClipboardWriteResult> => {
    const operation = ++generation;
    if (timeout) clearTimeout(timeout);
    timeout = null;
    const result = await copyText(text, { legacyFallback, anchor });
    if (disposed || operation !== generation) return result;
    if (result.ok) {
      error.value = null;
      copied.value = true;
    } else {
      copied.value = false;
      error.value =
        result.failure.status === 'unsupported' ? new Error('Clipboard is unavailable.') : result.failure.error;
    }
    settleAfter(toValue(resetAfter));
    return result;
  };

  onScopeDispose(() => {
    disposed = true;
    if (timeout) clearTimeout(timeout);
  });

  return { copied, error, copy, reset };
}
