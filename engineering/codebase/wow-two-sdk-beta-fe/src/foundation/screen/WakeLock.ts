import { toError } from '../errors';

import { getDocument, getNavigator, isFunction, readMember } from './ScreenEnvironment';
import type { ScreenFailure, ScreenStatus, ScreenRequestResult } from './ScreenOutcome';

/** The kinds of wake lock the platform defines. Only `screen` exists; the spec keeps the axis open. */
export const WakeLockKind = {
  /** Keeps the display on and undimmed. The only kind any browser implements today. */
  Screen: 'screen',
} as const;

/** One of the {@link WakeLockKind} values. */
export type WakeLockKind = (typeof WakeLockKind)[keyof typeof WakeLockKind];

/** `navigator.wakeLock.request`, as the platform exposes it. */
type WakeLockRequest = (this: unknown, type: string) => Promise<unknown>;

/** `WakeLockSentinel.release`, as the platform exposes it. */
type WakeLockRelease = (this: unknown) => Promise<void>;

/**
 * A held wake lock. Wraps the platform's `WakeLockSentinel` so that {@link WakeLockHandle.release} is total and
 * {@link WakeLockHandle.released} reads through to the live sentinel rather than a snapshot taken at request
 * time — the platform flips that flag on its own when the page is hidden.
 */
export interface WakeLockHandle {
  /** The kind of lock held. */
  readonly type: WakeLockKind;

  /** Whether the lock is no longer held — by an explicit release, or by the platform hiding the page. */
  readonly released: boolean;

  /** Releases the lock. Safe to call twice, and on an already-released lock. Never throws. */
  release: () => Promise<void>;

  /** Subscribes to platform release, including battery/visibility revocation. */
  subscribeRelease: (listener: () => void) => () => void;
}

/** Where a {@link holdWakeLock} sits: `idle` before its first request settles, then the last request's status. */
export type WakeLockStatus = 'idle' | ScreenStatus;

/** The observable state of a {@link WakeLockHold}. */
export interface WakeLockState {
  /** Whether a lock is held right now. Drops to `false` when the page is hidden, back to `true` on return. */
  readonly held: boolean;

  /** The status of the most recent request, or `idle` before the first one settles. */
  readonly status: WakeLockStatus;

  /** The error from the most recent non-`ok` request, or `null`. Always `null` for `unsupported`. */
  readonly error: Error | null;
}

/** Tunes a {@link holdWakeLock}. */
export interface WakeLockHoldOptions {
  /** The kind of lock to hold. Defaults to `screen`, the only kind implemented. */
  readonly type?: WakeLockKind;

  /** Called on every state transition — the seam `useWakeLock` renders from. A throw from it is swallowed. */
  readonly onChange?: (state: WakeLockState) => void;
}

/** A wake lock held across visibility changes until released. */
export interface WakeLockHold {
  /** The current state. Re-read it after an `onChange`; it is not reactive on its own. */
  readonly state: WakeLockState;

  /** Stops re-acquiring, unsubscribes, and releases any held lock. Idempotent. */
  release: () => void;
}

/**
 * The state before any request has settled. A module constant, not a fresh literal: `useWakeLock` resets to it
 * whenever it goes inactive, and a stable identity is what keeps that reset from waking every watcher on it.
 */
export const IdleWakeLockState: WakeLockState = { held: false, status: 'idle', error: null };

/** Sorts a rejected wake-lock request into the slice's vocabulary — see this file's header on `denied`. */
function classifyWakeLockRejection(cause: unknown): ScreenFailure {
  const error = toError(cause);

  if (error.name === 'NotAllowedError') return { status: 'denied', error };

  return { status: 'failed', error };
}

/** Wraps a platform sentinel so `release` cannot throw and `released` stays live. */
function toWakeLockHandle(sentinel: unknown, type: WakeLockKind): WakeLockHandle {
  return {
    type,

    get released(): boolean {
      // Read through on every access — the platform flips this when it takes the lock back.
      return readMember(sentinel, 'released') === true;
    },

    subscribeRelease: (listener) => {
      const add = readMember(sentinel, 'addEventListener');
      const remove = readMember(sentinel, 'removeEventListener');
      if (typeof add !== 'function' || typeof remove !== 'function') return () => {};
      try {
        add.call(sentinel, 'release', listener);
      } catch {
        return () => {};
      }
      return () => {
        try {
          remove.call(sentinel, 'release', listener);
        } catch {
          /* Released platform handle. */
        }
      };
    },
    release: async (): Promise<void> => {
      const release = readMember(sentinel, 'release') as WakeLockRelease | undefined;
      if (!isFunction(release) || release === undefined) return;

      try {
        await release.call(sentinel);
      } catch {
        // Already released, or the sentinel was detached with the document. Either way the lock is gone, which
        // is what the caller asked for — there is nothing to recover or report.
      }
    },
  };
}

/**
 * Requests a single wake lock.
 *
 * The lock this yields is released by the platform as soon as the page is hidden and is NOT restored on return —
 * prefer {@link holdWakeLock} unless you genuinely want one attempt. Must be called from an active, visible
 * document; a hidden one is rejected as `denied`.
 *
 * Never throws, never rejects.
 *
 * @param type The kind of lock. Defaults to `screen`.
 * @returns `ok` with the handle, or the classified failure.
 */
export async function requestWakeLock(
  type: WakeLockKind = WakeLockKind.Screen,
): Promise<ScreenRequestResult<WakeLockHandle>> {
  const nav = getNavigator();
  if (nav === undefined) return { ok: false, failure: { status: 'unsupported' } };

  const wakeLock = readMember(nav, 'wakeLock');
  const request = readMember(wakeLock, 'request') as WakeLockRequest | undefined;
  if (!isFunction(request) || request === undefined) return { ok: false, failure: { status: 'unsupported' } };

  try {
    const sentinel = await request.call(wakeLock, type);
    return { ok: true, value: toWakeLockHandle(sentinel, type) };
  } catch (error) {
    return { ok: false, failure: classifyWakeLockRejection(error) };
  }
}

/**
 * Holds a wake lock, re-acquiring it whenever the page returns to visible.
 *
 * This is the form a consumer normally wants: the platform drops the lock on every tab switch, notification, and
 * screen blank, and without the re-acquire the feature quietly stops working after the first one. Starts
 * requesting immediately and reports each transition through `options.onChange`.
 *
 * Call {@link WakeLockHold.release} when done — nothing else ends the cycle.
 *
 * Never throws.
 *
 * @param options The lock kind and the state-change callback.
 * @returns The live hold.
 */
export function holdWakeLock(options?: WakeLockHoldOptions): WakeLockHold {
  const type = options?.type ?? WakeLockKind.Screen;

  let state: WakeLockState = IdleWakeLockState;
  let handle: WakeLockHandle | null = null;
  let disposed = false;
  let acquiring = false;
  let unsubscribeRelease: (() => void) | undefined;
  const isHidden = (): boolean => readMember(getDocument(), 'visibilityState') === 'hidden';

  const publish = (next: WakeLockState): void => {
    state = next;

    const onChange = options?.onChange;
    if (onChange === undefined) return;

    try {
      onChange(next);
    } catch {
      // The consumer's own listener failed. The hold is unaffected and keeps its lock — swallowing here is the
      // same posture `foundation/share` takes with a throwing `onError`.
    }
  };

  const acquire = async (): Promise<void> => {
    if (disposed || acquiring || isHidden()) return;
    // Still holding a live lock — a `visible` → `visible` notification must not stack a second one.
    if (handle !== null && !handle.released) return;

    acquiring = true;
    try {
      const result = await requestWakeLock(type);

      if (disposed || isHidden()) {
        // Released while the request was in flight. Nothing is watching the state any more, but the lock itself
        // is real and would otherwise outlive the hold that owns it.
        if (result.ok) void result.value.release();
        return;
      }

      if (result.ok) {
        handle = result.value;
        const current = handle;
        unsubscribeRelease?.();
        unsubscribeRelease = current.subscribeRelease(() => {
          if (disposed || handle !== current) return;
          handle = null;
          unsubscribeRelease?.();
          unsubscribeRelease = undefined;
          publish({ held: false, status: 'ok', error: null });
        });
        publish({ held: !current.released, status: 'ok', error: null });
        return;
      }

      handle = null;
      publish({
        held: false,
        status: result.failure.status,
        error: result.failure.status === 'unsupported' ? null : result.failure.error,
      });
    } finally {
      acquiring = false;
    }
  };

  const onVisibilityChange = (): void => {
    if (disposed) return;

    const doc = getDocument();
    if (doc === undefined) return;

    if (readMember(doc, 'visibilityState') === 'visible') {
      void acquire();
      return;
    }

    // Hidden: the platform has already taken the lock back without telling us. Drop the handle so the next
    // `visible` re-requests, and report the loss so a consumer's indicator does not keep claiming it is held.
    const hiddenHandle = handle;
    handle = null;
    unsubscribeRelease?.();
    unsubscribeRelease = undefined;
    if (hiddenHandle) void hiddenHandle.release();
    if (state.held) publish({ held: false, status: state.status, error: state.error });
  };

  const doc = getDocument();
  const listening = doc !== undefined && isFunction(readMember(doc, 'addEventListener'));
  if (listening && doc !== undefined) doc.addEventListener('visibilitychange', onVisibilityChange);

  void acquire();

  return {
    get state(): WakeLockState {
      return state;
    },

    release: (): void => {
      if (disposed) return;
      disposed = true;

      if (listening && doc !== undefined) doc.removeEventListener('visibilitychange', onVisibilityChange);

      const current = handle;
      handle = null;
      unsubscribeRelease?.();
      unsubscribeRelease = undefined;
      if (current !== null) void current.release();

      // State is reset WITHOUT publishing. `release` runs from a scope-disposal cleanup, and calling back into a
      // consumer that is tearing down buys nothing — `useWakeLock` resets its own state on the same path.
      state = IdleWakeLockState;
    },
  };
}
