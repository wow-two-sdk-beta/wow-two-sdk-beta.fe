// Connectivity as a NON-VUE signal, for the factories in this slice that are plain functions and cannot
// call a composable.
//
// RELATIONSHIP TO `foundation/device`'s `useOnlineStatus` — READ BEFORE ADDING ANOTHER TRACKER. That
// composable is and remains THE Vue binding for connectivity; nothing here replaces it, and a component must
// keep using it. But `createPoller` and `waitForOnline` are framework-agnostic factories called from timers,
// effects, and `catch` blocks, where a composable is illegal. `device` keeps its reader module-private, so the
// choice was to export a reader from `device` (widening a slice this one has no business editing, and one
// another lane may be touching) or to keep a five-line reader here. This is the five-line reader, and it
// MIRRORS the composable's
// semantics deliberately: same optimistic default, same guarded read, same two events. If either changes,
// change both.
//
// WHAT `navigator.onLine` IS WORTH, restated because every caller gets this wrong: `false` is trustworthy
// (the browser knows there is no link); `true` only means a link exists — a captive portal, a dead VPN, or a
// server that is simply down all report `true`. So this drives "stop polling, nothing can succeed" and
// "wait before retrying", never "we are online, therefore this will work".
//
// `waitForOnline` RESOLVES A VERDICT AND NEVER THROWS, which is a deliberate deviation from `withTimeout` in
// `foundation/async` (that one rejects with a `TimeoutError`). Every call site for this function is ALREADY
// inside a failure path — a mutation just failed and the caller is deciding whether to retry. Rejecting
// there forces a nested try/catch around the recovery logic to distinguish "still offline" from a real
// fault, and a missed catch turns a recoverable failure into an unhandled rejection. A boolean reads as the
// question actually being asked: `if (await waitForOnline({ timeoutMs: 5_000 })) retry();`.

/**
 * Reads `navigator.onLine`, defaulting to online when there is no `navigator` (SSR), when the property is
 * missing (a partial polyfill), or when the read throws.
 *
 * Mirrors `useOnlineStatus`'s reader exactly — see this file's header for why the duplication is deliberate.
 *
 * @returns `true` while the browser reports a network link; optimistically `true` when unreadable.
 */
export function readOnlineStatus(): boolean {
  try {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  } catch {
    return true;
  }
}

/**
 * Subscribes to connectivity changes via the window `online` / `offline` events.
 *
 * A no-op returning a no-op disposer when there is no `window` (SSR), so callers need no environment branch.
 * The listener receives the new status, never a raw `Event`.
 *
 * @param listener - Invoked with `true` on `online` and `false` on `offline`.
 * @returns A disposer that detaches both listeners; safe to call more than once.
 */
export function subscribeOnline(listener: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const target = window;
  const onOnline = (): void => listener(true);
  const onOffline = (): void => listener(false);

  target.addEventListener('online', onOnline);
  target.addEventListener('offline', onOffline);

  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    target.removeEventListener('online', onOnline);
    target.removeEventListener('offline', onOffline);
  };
}

/** Configures a {@link waitForOnline} call. Every member is optional. */
export interface WaitForOnlineOptions {
  /** Max wait (ms) before resolving `false`. Omit, or pass a non-positive value, to wait indefinitely. */
  readonly timeoutMs?: number;

  /** Abandons the wait early, resolving `false` — an abort is a "stop waiting" verdict here, never a rejection. */
  readonly signal?: AbortSignal;
}

/**
 * Waits for connectivity to come back, resolving `true` the moment it does.
 *
 * Resolves `true` immediately when already online, and `false` when the timeout lapses or the signal aborts —
 * never rejects, and never leaves a timer or a listener behind on any of those paths. Under SSR, or wherever
 * connectivity cannot be observed, it resolves `true` at once rather than hanging on an event that can never
 * arrive.
 *
 * Remember what a `true` verdict is worth (see this file's header): it says a link exists, not that the
 * server is reachable. Use it to gate a retry, then let the retry decide.
 *
 * @param options - The deadline and cancellation signal.
 * @returns `true` when connectivity is (or becomes) available; `false` on timeout or abort.
 */
export function waitForOnline(options: WaitForOnlineOptions = {}): Promise<boolean> {
  const { timeoutMs, signal } = options;

  if (readOnlineStatus()) return Promise.resolve(true);
  if (signal?.aborted === true) return Promise.resolve(false);
  // Nothing to listen on — an indefinite wait here could never be satisfied, so answer with the current read
  // instead of hanging forever.
  if (typeof window === 'undefined') return Promise.resolve(readOnlineStatus());

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;

    /** The single teardown every exit path runs — timer, connectivity listeners, and abort listener alike. */
    const cleanup = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      unsubscribe?.();
      unsubscribe = undefined;
      if (signal !== undefined && onAbort !== undefined) {
        signal.removeEventListener('abort', onAbort);
        onAbort = undefined;
      }
    };

    /** Settles once and only once — three racing sources can all fire in the same tick. */
    const finish = (online: boolean): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(online);
    };

    unsubscribe = subscribeOnline((online) => {
      if (online) finish(true);
    });

    if (timeoutMs !== undefined && timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timer = setTimeout(() => {
        timer = undefined;
        finish(false);
      }, timeoutMs);
    }

    if (signal !== undefined) {
      const listener = (): void => finish(false);
      onAbort = listener;
      signal.addEventListener('abort', listener, { once: true });
    }
  });
}
