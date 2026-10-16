import { onScopeDispose, shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { copyText } from '../CopyText';
import type { ClipboardWriteResult } from '../ClipboardResult';

export interface UseClipboardOptions {
  /** Reset `copied` back to false after this many ms. Default 2000. Set 0 to keep state until explicitly reset. */
  resetAfter?: MaybeRefOrGetter<number>;
}

export interface ClipboardControls {
  /** True for `resetAfter` ms after a successful copy. */
  copied: Readonly<ShallowRef<boolean>>;

  /** Last error from `navigator.clipboard.writeText`, if any. */
  error: Readonly<ShallowRef<Error | null>>;

  /** Writes text and returns the completed success or failure to the caller. */
  copy: (text: string) => Promise<ClipboardWriteResult>;

  /** Force-clear the `copied` flag. */
  reset: () => void;
}

/**
 * Wraps `navigator.clipboard.writeText` with a transient `copied` flag for
 * post-action UI (icon swap, "Copied!" tooltip). Pass `resetAfter: 0` to
 * keep `copied` true until you call `reset()`.
 *
 * `resetAfter` may be a ref or getter; it is read at copy time, so a window
 * changed between copies takes effect on the next one.
 */
export function useClipboard({ resetAfter = 2000 }: UseClipboardOptions = {}): ClipboardControls {
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

  const copy = async (text: string): Promise<ClipboardWriteResult> => {
    const operation = ++generation;
    if (timeout) clearTimeout(timeout);
    timeout = null;
    const result = await copyText(text);
    if (disposed || operation !== generation) return result;
    if (result.ok) {
      error.value = null;
      copied.value = true;
      const resetWindow = toValue(resetAfter);
      if (resetWindow > 0) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          timeout = null;
          copied.value = false;
        }, resetWindow);
      }
    } else {
      copied.value = false;
      error.value =
        result.failure.status === 'unsupported' ? new Error('Clipboard is unavailable.') : result.failure.error;
    }
    return result;
  };

  onScopeDispose(() => {
    disposed = true;
    if (timeout) clearTimeout(timeout);
  });

  return { copied, error, copy, reset };
}
