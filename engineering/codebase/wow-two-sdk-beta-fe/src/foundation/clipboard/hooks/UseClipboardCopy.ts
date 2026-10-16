import { onScopeDispose, shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import type { ClipboardCopyOptions, ClipboardWriteResult, ClipboardWriteStatus } from '../ClipboardResult';
import { copyText } from '../CopyText';

/** How long a status lingers before the composable returns to `idle`, when the caller does not say. */
const DefaultResetAfterMs = 2000;

/** Where a {@link useClipboardCopy} instance sits: `idle` before the first attempt, otherwise the last outcome. */
export type ClipboardCopyState = 'idle' | ClipboardWriteStatus;

/** Tunes a {@link useClipboardCopy} instance. */
export interface UseClipboardCopyOptions extends ClipboardCopyOptions {
  /**
   * How long `status` holds the last outcome before returning to `idle`, in milliseconds. Defaults to 2000 —
   * long enough to read "Copied!", short enough not to linger.
   *
   * Pass `0` to hold the status until {@link ClipboardCopyControls.reset} is called, which is what a failure
   * message the user must acknowledge wants.
   */
  readonly resetAfterMs?: number;
}

/** What {@link useClipboardCopy} returns. */
export interface ClipboardCopyControls {
  /**
   * The last outcome, or `idle` before the first attempt and after the reset window. Drives the icon swap, the
   * "Copied!" label, and the `denied` / `unsupported` fallback copy.
   */
  readonly status: Readonly<ShallowRef<ClipboardCopyState>>;

  /**
   * Writes `text` to the clipboard and resolves to the full result — the awaiting caller branches on the
   * outcome, while `status` drives the render. Never throws, never rejects.
   */
  readonly copy: (text: string) => Promise<ClipboardWriteResult>;

  /** Returns `status` to `idle` immediately and cancels the pending auto-reset. */
  readonly reset: () => void;
}

/**
 * Wraps `copyText` in a transient status for post-action UI, without swallowing the outcome.
 *
 * Call `copy` from a user gesture — the platform requires transient activation, and a copy fired from a watcher
 * or a timeout comes back `denied`.
 *
 * @param options Error reporting, the legacy-fallback opt-in, and the auto-reset window. Read fresh on every
 *   call, so a ref or getter keeps them live.
 */
export function useClipboardCopy(
  options?: MaybeRefOrGetter<UseClipboardCopyOptions | undefined>,
): ClipboardCopyControls {
  const status = shallowRef<ClipboardCopyState>('idle');

  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let generation = 0;

  /** Cancels a pending auto-reset. Safe to call when none is scheduled. */
  function clearTimer(): void {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  onScopeDispose(() => {
    disposed = true;
    clearTimer();
  });

  const copy = async (text: string): Promise<ClipboardWriteResult> => {
    const operation = ++generation;
    clearTimer();
    const result = await copyText(text, toValue(options));

    // The scope may have been disposed while the write was in flight. The RESULT still goes back to the
    // caller — it is the answer to their call, not a piece of this component's state.
    if (disposed || operation !== generation) return result;

    clearTimer();
    status.value = result.ok ? 'copied' : result.failure.status;

    const resetAfterMs = toValue(options)?.resetAfterMs ?? DefaultResetAfterMs;
    if (resetAfterMs > 0) {
      timer = setTimeout(() => {
        timer = null;
        status.value = 'idle';
      }, resetAfterMs);
    }

    return result;
  };

  const reset = (): void => {
    generation++;
    clearTimer();
    status.value = 'idle';
  };

  return { status, copy, reset };
}
