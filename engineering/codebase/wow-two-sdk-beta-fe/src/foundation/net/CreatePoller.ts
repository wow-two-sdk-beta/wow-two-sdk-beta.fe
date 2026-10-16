// Interval polling that stops burning quota when nobody is looking.
//
// WHY A HIDDEN TAB MUST NOT POLL: a background tab is invisible, not closed. A 10-second poll left running
// across a workday is thousands of requests nobody will ever see the result of — paid for in the user's
// battery, the user's mobile data, and the API's rate limit, which is then unavailable to the tab the user is
// actually looking at. Browsers throttle background timers, but throttling is not stopping: the requests
// still go out, just less punctually. So this suspends on `visibilitychange` and, by default, refreshes
// immediately on return, since data that went stale while hidden is the first thing the returning user reads.
//
// WHY OFFLINE MUST NOT POLL: every tick during an outage is a guaranteed failure. Left running it produces a
// stream of errors that drowns the log, trips error-rate alerting, and — where the poll feeds a UI — flickers
// a failure banner on a schedule. Suspending costs nothing, because the `online` event fires the moment there
// is anything to poll for.
//
// SUSPENSION IS REASON-COUNTED, NOT A BOOLEAN, and this is the non-obvious part. Three independent things can
// suspend the poller — the caller's `pause()`, a hidden tab, an offline browser — and with one flag they
// overwrite each other: the tab regains focus, clears the flag, and silently resumes a poller the CALLER
// paused, which is a real bug (a modal that paused polling reopens to a poller running behind it). A set of
// reasons makes the rule exact: the poller ticks only when the set is empty, and `resume()` clears only the
// caller's reason.
//
// TICKS DO NOT OVERLAP. Scheduling is a `setTimeout` CHAIN, re-armed after each run settles, not a
// `setInterval`. With an interval, a poll slower than its period stacks: requests overlap, responses arrive
// out of order, and the slowest response wins the UI — worse the more congested the network is, which is
// exactly when it hurts. The chain makes `intervalMs` the gap BETWEEN runs, so a slow backend degrades to
// polling less often instead of DDoSing itself.
//
// CONNECTIVITY IS READ THROUGH `Liveness.ts`, whose header explains why this slice has a non-Vue reader at
// all instead of `foundation/device`'s `useOnlineStatus`.

import { toError } from '../errors';

import { readOnlineStatus, subscribeOnline } from './Liveness';

/** The default gap between polls. */
const DefaultIntervalMs = 30_000;

/** Names why a poller is suspended — a set of these, not a flag, so the reasons cannot overwrite each other. */
const SuspendReason = {
  /** Refers to the caller's own `pause()`. Cleared only by `resume()`. */
  Manual: 'manual',
  /** Refers to a hidden tab. Cleared by `visibilitychange`. */
  Hidden: 'hidden',
  /** Refers to an offline browser. Cleared by the `online` event. */
  Offline: 'offline',
} as const;

type SuspendReason = (typeof SuspendReason)[keyof typeof SuspendReason];

/** Describes what a poller is doing right now. */
export const PollerState = {
  /** Refers to a poller created but not started. */
  Idle: 'idle',
  /** Refers to a poller with a tick scheduled or running. */
  Running: 'running',
  /** Refers to a started poller held by at least one suspend reason — paused, hidden, or offline. */
  Paused: 'paused',
  /** Refers to a stopped poller: timers cleared, listeners detached, restartable with `start()`. */
  Stopped: 'stopped',
} as const;

export type PollerState = (typeof PollerState)[keyof typeof PollerState];

/** The work a poller repeats. A returned promise is awaited, so the next tick is scheduled only after it settles. */
export type PollFn = () => unknown;

/** Configures a {@link createPoller} call. Every member is optional. */
export interface PollerOptions {
  /** The gap (ms) between the end of one poll and the start of the next. Default `30000`. */
  readonly intervalMs?: number;

  /** Whether to start polling immediately on creation. Default `true`; `false` waits for `start()`. */
  readonly autoStart?: boolean;

  /** Whether to run one poll at once on start, rather than after the first interval. Default `false`. */
  readonly immediate?: boolean;

  /** Whether to suspend while the tab is hidden. Default `true`. */
  readonly pauseWhenHidden?: boolean;

  /** Whether to suspend while the browser reports no network link. Default `true`. */
  readonly pauseWhenOffline?: boolean;

  /**
   * Whether returning from a suspension polls at once instead of waiting a full interval. Default `true` — the
   * data is already stale.
   */
  readonly refreshOnResume?: boolean;

  /**
   * Receives an error thrown or rejected by the poll. The chain continues regardless — a failed poll is not a
   * reason to stop polling.
   */
  readonly onError?: (error: Error) => void;

  /** Fires on every state transition — the seam for a "paused (offline)" indicator. */
  readonly onStateChange?: (state: PollerState) => void;
}

/** Controls a running poll loop. */
export interface Poller {
  /** The current state. `paused` covers all three suspend reasons. */
  readonly state: PollerState;

  /** Starts (or restarts) polling. A no-op while already running. */
  start(): void;

  /** Suspends polling until `resume()`. Independent of the automatic hidden / offline suspensions. */
  pause(): void;

  /** Clears the caller's suspension. Polling stays suspended while the tab is hidden or the browser offline. */
  resume(): void;

  /** Stops polling, clears the pending timer, and detaches the visibility and connectivity listeners. Idempotent. */
  stop(): void;
}

/** Reads `document.visibilityState`, defaulting to visible where there is no document (SSR) or the read throws. */
function readHidden(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    return document.visibilityState === 'hidden';
  } catch {
    return false;
  }
}

/**
 * Subscribes to `visibilitychange`, reporting whether the document is now hidden.
 *
 * A no-op returning a no-op disposer where there is no `document`, so callers need no environment branch.
 */
function subscribeVisibility(listener: (hidden: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => undefined;

  const target = document;
  const onChange = (): void => listener(readHidden());
  target.addEventListener('visibilitychange', onChange);

  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    target.removeEventListener('visibilitychange', onChange);
  };
}

/**
 * Creates a poller that repeats `fn` on an interval and suspends itself while the tab is hidden or the
 * browser is offline — see this file's header for why both of those are non-negotiable.
 *
 * Never throws: an error from `fn` goes to `onError` and the loop continues, because a poll that failed once
 * is the poll most worth retrying. Ticks never overlap.
 *
 * @param fn - The work to repeat; a returned promise is awaited before the next tick is scheduled.
 * @param options - Interval, suspension behaviour, and hooks.
 * @returns The poller handle. ALWAYS call `stop()` when done — a live poller holds a timer and two document /
 * window listeners.
 */
export function createPoller(fn: PollFn, options: PollerOptions = {}): Poller {
  const {
    intervalMs = DefaultIntervalMs,
    autoStart = true,
    immediate = false,
    pauseWhenHidden = true,
    pauseWhenOffline = true,
    refreshOnResume = true,
    onError,
    onStateChange,
  } = options;

  const suspended = new Set<SuspendReason>();

  let state: PollerState = PollerState.Idle;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let inFlight = false;
  let unsubscribeVisibility: (() => void) | undefined;
  let unsubscribeOnline: (() => void) | undefined;

  /** Publishes a state transition, skipping no-op repeats. */
  const setState = (next: PollerState): void => {
    if (state === next) return;
    state = next;
    try {
      onStateChange?.(next);
    } catch (error) {
      try {
        onError?.(toError(error));
      } catch {
        /* Observer failures do not interrupt scheduling. */
      }
    }
  };

  /** Clears the pending tick, if any. Never touches the listeners — suspension keeps them. */
  const clearPending = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  /** Arms the next tick. Refuses while stopped or suspended, which is what makes every suspend path a one-liner. */
  const scheduleNext = (): void => {
    if (!running || suspended.size > 0 || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      void tick();
    }, intervalMs);
  };

  /** Runs one poll and re-arms — the chain that replaces `setInterval`. */
  async function tick(): Promise<void> {
    if (!running || suspended.size > 0 || inFlight) return;

    inFlight = true;
    try {
      await fn();
    } catch (error) {
      try {
        onError?.(toError(error));
      } catch {
        // Swallowed by contract: a throwing error handler must not break the loop it was told about.
      }
    } finally {
      inFlight = false;
    }

    // Re-checked AFTER the await: the poll may have been stopped or suspended while it was in flight, and
    // arming a timer for a poller that is already gone is exactly how a "stopped" poller keeps ticking.
    scheduleNext();
  }

  /** Adds a suspend reason and parks the loop. */
  const suspend = (reason: SuspendReason): void => {
    if (suspended.has(reason)) return;
    suspended.add(reason);
    clearPending();
    if (running) setState(PollerState.Paused);
  };

  /** Removes a suspend reason and, once none remain, resumes — immediately when `refreshOnResume`. */
  const unsuspend = (reason: SuspendReason): void => {
    if (!suspended.delete(reason)) return;
    if (!running || suspended.size > 0) return;

    setState(PollerState.Running);
    if (refreshOnResume) void tick();
    else scheduleNext();
  };

  /** Attaches the visibility and connectivity listeners and seeds the matching suspend reasons. */
  const attachEnvironment = (): void => {
    if (pauseWhenHidden) {
      if (readHidden()) suspended.add(SuspendReason.Hidden);
      unsubscribeVisibility = subscribeVisibility((hidden) => {
        if (hidden) suspend(SuspendReason.Hidden);
        else unsuspend(SuspendReason.Hidden);
      });
    }

    if (pauseWhenOffline) {
      if (!readOnlineStatus()) suspended.add(SuspendReason.Offline);
      unsubscribeOnline = subscribeOnline((online) => {
        if (online) unsuspend(SuspendReason.Offline);
        else suspend(SuspendReason.Offline);
      });
    }
  };

  /** Detaches both environment listeners. Idempotent. */
  const detachEnvironment = (): void => {
    unsubscribeVisibility?.();
    unsubscribeVisibility = undefined;
    unsubscribeOnline?.();
    unsubscribeOnline = undefined;
  };

  const poller: Poller = {
    get state() {
      return state;
    },

    start(): void {
      if (running) return;
      running = true;
      // A restart begins from a clean slate — a stale `hidden` reason left over from the previous run would
      // otherwise park the poller forever, since the event that would clear it has already fired.
      suspended.clear();
      attachEnvironment();

      if (suspended.size > 0) {
        setState(PollerState.Paused);
        return;
      }

      setState(PollerState.Running);
      if (immediate) void tick();
      else scheduleNext();
    },

    pause(): void {
      suspend(SuspendReason.Manual);
    },

    resume(): void {
      unsuspend(SuspendReason.Manual);
    },

    stop(): void {
      if (!running && state === PollerState.Stopped) return;
      running = false;
      clearPending();
      detachEnvironment();
      suspended.clear();
      setState(PollerState.Stopped);
    },
  };

  if (autoStart) poller.start();

  return poller;
}
