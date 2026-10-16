import {
  computed,
  onScopeDispose,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';

import { share, type ShareSendResult } from './Share';
import type { ShareData } from './ShareData';
import { shareOrCopy, type ShareOrCopyOptions, type ShareSendOrCopyResult } from './ShareOrCopy';

/** Where a `useShare` instance sits in its cycle: idle, or awaiting the native sheet / clipboard write. */
export const ShareState = {
  /** Nothing in flight — the resting state, and the one every attempt returns to. */
  Idle: 'idle',

  /** The native sheet is open, or the clipboard fallback is mid-write. */
  Sharing: 'sharing',
} as const;

/** Where a `useShare` instance sits in its cycle: idle, or awaiting the native sheet / clipboard write. */
export type ShareState = (typeof ShareState)[keyof typeof ShareState];

/** What {@link useShare} returns. */
export interface ShareControls {
  /** `sharing` while an attempt is in flight, `idle` otherwise. */
  readonly state: Readonly<ShallowRef<ShareState>>;

  /** Convenience for `state === ShareState.Sharing` — the flag a button's `disabled` / spinner wants. */
  readonly sharing: ComputedRef<boolean>;

  /** The most recent outcome, or `null` before the first attempt and after {@link ShareControls.reset}. */
  readonly result: Readonly<ShallowRef<ShareSendResult | ShareSendOrCopyResult | null>>;

  /** Whether the last attempt ended in a clipboard copy — the cue for a "Link copied" confirmation. */
  readonly copied: ComputedRef<boolean>;

  /** Opens the native sheet with no fallback. Resolves to the result; never throws. */
  readonly share: (data: ShareData) => Promise<ShareSendResult>;

  /** Opens the native sheet, degrading to a clipboard copy when unsupported. Resolves to the result; never throws. */
  readonly shareOrCopy: (data: ShareData) => Promise<ShareSendOrCopyResult>;

  /** Clears `result` and returns `state` to `idle`. */
  readonly reset: () => void;
}

/**
 * Wraps the share vector in an `idle` / `sharing` + last-result state machine. Inherits the module's
 * never-throws contract — a rejected promise is not one of the outcomes.
 *
 * @param options Forwarded to `share` / `shareOrCopy`. A ref or getter is read at call time.
 */
export function useShare(options?: MaybeRefOrGetter<ShareOrCopyOptions | undefined>): ShareControls {
  const state = shallowRef<ShareState>(ShareState.Idle);
  const result = shallowRef<ShareSendResult | ShareSendOrCopyResult | null>(null);
  let latest = 0;
  let disposed = false;
  const pending = new Set<number>();
  onScopeDispose(() => {
    disposed = true;
    pending.clear();
  });

  /** Runs one attempt, bracketing it with the pending flag and recording the outcome. */
  async function run<TResult extends ShareSendResult | ShareSendOrCopyResult>(
    attempt: () => Promise<TResult>,
  ): Promise<TResult> {
    const operation = ++latest;
    pending.add(operation);
    if (!disposed) state.value = ShareState.Sharing;
    try {
      const outcome = await attempt();
      if (!disposed && operation === latest) result.value = outcome;
      return outcome;
    } finally {
      pending.delete(operation);
      if (!disposed) state.value = pending.size > 0 ? ShareState.Sharing : ShareState.Idle;
    }
  }

  const runShare = (data: ShareData): Promise<ShareSendResult> => run(() => share(data, toValue(options)));

  const runShareOrCopy = (data: ShareData): Promise<ShareSendOrCopyResult> =>
    run(() => shareOrCopy(data, toValue(options)));

  const reset = (): void => {
    latest++;
    pending.clear();
    state.value = ShareState.Idle;
    result.value = null;
  };

  return {
    state,
    sharing: computed(() => state.value === ShareState.Sharing),
    result,
    copied: computed(() => result.value?.ok === true && result.value.value === 'copied'),
    share: runShare,
    shareOrCopy: runShareOrCopy,
    reset,
  };
}
