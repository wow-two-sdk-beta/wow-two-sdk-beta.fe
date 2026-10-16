// Server-Sent Events with typed named-event handlers and a reconnect that does NOT fight the browser's own.
//
// THE DOUBLE-RECONNECT TRAP, which is the whole reason this wrapper is subtle. `EventSource` already
// reconnects by itself: on an ordinary drop the browser sets `readyState` back to `CONNECTING`, waits out its
// own delay (the server can set it with a `retry:` field), and re-opens the SAME `EventSource` object. It
// fires `error` while doing so. So the naive wrapper — "on error, make a new `EventSource`" — ends up with
// TWO live connections for one drop: the browser's retry on the old object, plus the wrapper's new one. Each
// subsequent drop doubles again. The symptom is duplicated events and a server that sees connection counts
// climb, never a thrown error, which is why this ships to production so often.
//
// HOW THIS AVOIDS IT: the `error` handler branches on `source.readyState`, which is the only signal that
// distinguishes the two cases.
//   - `CONNECTING` (0) — the browser owns this retry and is already running it. The wrapper arms NO timer and
//     builds NO `EventSource`; it only reports the error with `owner: 'browser'` and shows `reconnecting`.
//   - `CLOSED` (2) — the browser has given up for good (a non-2xx response, a wrong content type, a bad
//     CORS preflight; none of these are retried by the spec). Only here does the wrapper take over: it
//     detaches its listeners, closes the dead object, and schedules a fresh connect on `resilience` backoff.
// The two owners are therefore mutually exclusive by construction, and `ReconnectOwner` reports which one is
// acting so a consumer can log it. The scheduler's own stacking guard backstops the invariant.
//
// WHY THE FATAL CASE STILL RETRIES AT ALL: the browser abandons the stream on a 502 from a proxy that is
// restarting, or on the 401 that follows an expired token — both routinely fix themselves. Leaving the page
// permanently dead because a gateway blinked is worse than a bounded reconnect, and a caller who disagrees
// passes `retry: false`.
//
// NAMED EVENTS ARE A MAP, NOT A SWITCH. A server sending `event: order-updated` delivers to a listener
// registered for that exact name, and NOT to `onmessage` — a detail that silently breaks the "I subscribed to
// onMessage but receive nothing" case. `options.events` registers one real listener per key, and the generic
// parameter types each payload independently.

import { toError } from '../errors';
import type { RetryPolicy } from '../resilience';

import { ConnectionState, EventSourceReadyState } from './ConnectionState';
import { createReconnectScheduler } from './Reconnect';

/**
 * The minimal `EventSource` surface this wrapper drives. Narrow on purpose: a test double or a polyfill can
 * satisfy it in a few lines, and the real `EventSource` satisfies it structurally.
 */
export interface EventStreamSource {
  /** The wire ready-state — see {@link EventSourceReadyState}. The branch the double-reconnect guard turns on. */
  readonly readyState: number;

  /** Closes the connection and stops the browser's own reconnection. */
  close(): void;

  /** Registers a listener for `open`, `error`, `message`, or a server-named event. */
  addEventListener(type: string, listener: (event: Event) => void): void;

  /** Removes a previously registered listener. */
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

/** Builds the underlying source — injectable so tests and polyfills need no global. */
export type EventStreamSourceFactory = (url: string, init: { withCredentials: boolean }) => EventStreamSource;

/** Identifies who is retrying a broken stream — the guard against reconnecting on top of the browser. */
export const ReconnectOwner = {
  /** Refers to the browser's own `EventSource` retry already being in flight; this wrapper stands down. */
  Browser: 'browser',
  /** Refers to the browser having given up, with this wrapper's `resilience`-scheduled retry pending. */
  Wrapper: 'wrapper',
  /** Refers to nobody retrying — reconnection is disabled, the attempt budget is spent, or the stream was closed. */
  None: 'none',
} as const;

export type ReconnectOwner = (typeof ReconnectOwner)[keyof typeof ReconnectOwner];

/** Describes a stream failure — above all, who (if anyone) is going to do something about it. */
export interface EventStreamErrorContext {
  /** Whoever is retrying this failure. See {@link ReconnectOwner}. */
  readonly owner: ReconnectOwner;

  /** The wrapper's consecutive attempt count; `0` while the browser owns the retry, since nothing is armed yet. */
  readonly attempt: number;

  /** The connection state after this failure was handled. */
  readonly state: ConnectionState;
}

/**
 * Maps each server event name to the payload it carries — the generic every handler in
 * {@link EventStreamOptions.events} is typed from.
 */
export type EventStreamPayloads = Record<string, unknown>;

/** Maps event names to their handlers, each typed by that event's payload. */
export type EventStreamHandlers<TEvents extends EventStreamPayloads> = {
  readonly [K in keyof TEvents & string]?: (data: TEvents[K], event: MessageEvent<string>) => void;
};

/** Configures a {@link createEventStream} call. Every member is optional. */
export interface EventStreamOptions<TEvents extends EventStreamPayloads = EventStreamPayloads> {
  /** Handlers for server-NAMED events (`event: order-updated`). Never reach {@link EventStreamOptions.onMessage}. */
  readonly events?: EventStreamHandlers<TEvents>;

  /** Handles unnamed events only — the default `message` type. */
  readonly onMessage?: (data: unknown, event: MessageEvent<string>) => void;

  /** Fires each time the connection opens, including after every reconnect. */
  readonly onOpen?: () => void;

  /** Fires on every failure, with the context saying who is retrying it. */
  readonly onError?: (error: Error, context: EventStreamErrorContext) => void;

  /** Fires on every connection-state transition — the seam for a "reconnecting…" indicator. */
  readonly onStateChange?: (state: ConnectionState) => void;

  /** Whether to send credentials cross-origin. Default `false`. */
  readonly withCredentials?: boolean;

  /**
   * Decodes a frame's `data` text. Default: `JSON.parse`, falling back to the RAW STRING when the text is not
   * JSON — SSE carries text, and plain-text frames and sentinels like `[DONE]` are common enough that
   * throwing on them would be hostile. Supply this to be strict, or to decode another format.
   */
  readonly parse?: (raw: string) => unknown;

  /**
   * The reconnect policy for failures the browser abandons, or `false` to never reconnect.
   * Default `DefaultReconnectPolicy`.
   */
  readonly retry?: RetryPolicy | false;

  /** The randomness feeding backoff jitter — injectable for deterministic tests. Default `Math.random`. */
  readonly random?: () => number;

  /** The source factory. Default constructs a global `EventSource`; inject a double in tests. */
  readonly eventSource?: EventStreamSourceFactory;
}

/** Controls a live Server-Sent Events subscription. */
export interface EventStream {
  /** The current connection state — `reconnecting` covers both the browser's retry and this wrapper's. */
  readonly readyState: ConnectionState;

  /** Whether an `EventSource` implementation was available at all; `false` under SSR, where the stream is inert. */
  readonly supported: boolean;

  /** The wrapper's consecutive reconnect attempts, zeroed on every successful open. */
  readonly attempts: number;

  /**
   * Closes the stream, cancels any pending reconnect, and detaches every listener. Idempotent; suppresses all
   * further reconnection.
   */
  close(): void;
}

/** Decodes frame text as JSON, falling back to the raw string — see {@link EventStreamOptions.parse}. */
function parseFrame(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

/** Reads a listener's event as a message frame; non-string `data` is coerced so a double can pass plain objects. */
function frameTextOf(event: Event): { text: string; message: MessageEvent<string> } {
  const message = event as MessageEvent<string>;
  const data: unknown = message.data;
  return { text: typeof data === 'string' ? data : String(data), message };
}

/** Resolves the source factory: the injected one, else global `EventSource`, else `undefined` (SSR / unsupported). */
function resolveSourceFactory(injected?: EventStreamSourceFactory): EventStreamSourceFactory | undefined {
  if (injected !== undefined) return injected;
  if (typeof EventSource === 'undefined') return undefined;
  return (url, init) => new EventSource(url, init);
}

/**
 * Opens a Server-Sent Events stream with typed named-event handlers and a reconnect that defers to the
 * browser's own — see this file's header for how the double-reconnect is avoided.
 *
 * Never throws, at import time or at call time. Where `EventSource` does not exist (SSR, a locked-down
 * runtime) the returned stream reports `supported: false` and state `closed`, and every method is a no-op —
 * a defined answer rather than an exception a render cannot catch.
 *
 * @typeParam TEvents - Maps each server event name to its payload type.
 * @param url - The stream endpoint.
 * @param options - Handlers, retry policy, parsing, and injection seams.
 * @returns The stream handle. ALWAYS call `close()` when done — an open `EventSource` survives navigation
 * within an SPA and keeps both the connection and every captured handler alive.
 */
export function createEventStream<TEvents extends EventStreamPayloads = EventStreamPayloads>(
  url: string,
  options: EventStreamOptions<TEvents> = {},
): EventStream {
  const {
    events,
    onMessage,
    onOpen,
    onError,
    onStateChange,
    withCredentials = false,
    parse = parseFrame,
    retry,
    random,
    eventSource,
  } = options;

  const factory = resolveSourceFactory(eventSource);
  const scheduler = createReconnectScheduler({ retry, random });

  let state: ConnectionState = ConnectionState.Connecting;
  let source: EventStreamSource | undefined;
  let detach: (() => void) | undefined;
  let closed = false;

  /** Publishes a state transition, skipping no-op repeats so a consumer's `onStateChange` is not spammed. */
  const setState = (next: ConnectionState): void => {
    if (state === next) return;
    state = next;
    try {
      onStateChange?.(next);
    } catch (error) {
      report(error, ReconnectOwner.None, scheduler.attempts);
    }
  };

  /** Reports a failure, tolerating a throwing consumer handler — a bad listener must not break the transport. */
  const report = (error: unknown, owner: ReconnectOwner, attempt: number): void => {
    try {
      onError?.(toError(error), { owner, attempt, state });
    } catch {
      // Swallowed by contract: this runs from a DOM event handler, where a throw is unhandleable noise.
    }
  };

  /** Binds every listener to a source and returns the matching detach — one closure so no listener can be missed. */
  const bind = (target: EventStreamSource): (() => void) => {
    const bound: [type: string, listener: (event: Event) => void][] = [];

    /** Registers a listener and records it for the paired detach. */
    const on = (type: string, listener: (event: Event) => void): void => {
      target.addEventListener(type, listener);
      bound.push([type, listener]);
    };

    on('open', () => {
      // A successful open zeroes the attempt counter — otherwise a long-lived stream that blipped once
      // spends the rest of the session starting from the maximum delay.
      scheduler.reset();
      setState(ConnectionState.Open);
      if (closed || source !== target) return;
      try {
        onOpen?.();
      } catch (error) {
        report(error, ReconnectOwner.None, scheduler.attempts);
      }
    });

    // The `error` event itself carries nothing useful — the spec gives it no reason, no status, no body.
    // Everything actionable is in `readyState`, which is why only the source is passed on.
    on('error', () => handleError(target));

    if (onMessage !== undefined) {
      on('message', (event) => {
        const { text, message } = frameTextOf(event);
        try {
          onMessage(parse(text), message);
        } catch (error) {
          report(error, ReconnectOwner.None, scheduler.attempts);
        }
      });
    }

    for (const name of Object.keys(events ?? {})) {
      const handler = (events as Record<string, ((data: unknown, event: MessageEvent<string>) => void) | undefined>)[
        name
      ];
      if (handler === undefined) continue;
      on(name, (event) => {
        const { text, message } = frameTextOf(event);
        try {
          handler(parse(text), message);
        } catch (error) {
          report(error, ReconnectOwner.None, scheduler.attempts);
        }
      });
    }

    return () => {
      for (const entry of bound) target.removeEventListener(entry[0], entry[1]);
      bound.length = 0;
    };
  };

  /** Opens a source and binds it; a constructor throw (a malformed URL) is reported, not propagated. */
  const connect = (): void => {
    if (closed || factory === undefined) return;

    setState(scheduler.attempts === 0 ? ConnectionState.Connecting : ConnectionState.Reconnecting);

    let opened: EventStreamSource;
    try {
      opened = factory(url, { withCredentials });
    } catch (error) {
      const scheduled = scheduler.schedule(connect);
      setState(scheduled ? ConnectionState.Reconnecting : ConnectionState.Closed);
      report(error, scheduled ? ReconnectOwner.Wrapper : ReconnectOwner.None, scheduler.attempts);
      return;
    }

    source = opened;
    detach = bind(opened);
  };

  /** The double-reconnect guard: branch on the wire ready-state, never retry what the browser is already retrying. */
  function handleError(target: EventStreamSource): void {
    if (closed) return;

    // The browser is mid-reconnect on this very object. Arming anything here is the duplicate-connection bug.
    if (target.readyState === EventSourceReadyState.Connecting) {
      setState(ConnectionState.Reconnecting);
      report(new Error(`The event stream to ${url} dropped; the browser is reconnecting.`), ReconnectOwner.Browser, 0);
      return;
    }

    // `CLOSED` — the browser will do nothing further. Tear the dead object down completely before replacing
    // it: an un-detached listener on a closed source still pins every closure it captured.
    detach?.();
    detach = undefined;
    target.close();
    source = undefined;

    const scheduled = scheduler.schedule(connect);
    setState(scheduled ? ConnectionState.Reconnecting : ConnectionState.Closed);
    report(
      new Error(`The event stream to ${url} failed and the browser stopped retrying.`),
      scheduled ? ReconnectOwner.Wrapper : ReconnectOwner.None,
      scheduler.attempts,
    );
  }

  if (factory === undefined) {
    // Unsupported: a defined, inert answer. No throw, no listeners, no timers.
    state = ConnectionState.Closed;
    return {
      get readyState() {
        return state;
      },
      supported: false,
      get attempts() {
        return 0;
      },
      close: () => undefined,
    };
  }

  connect();

  return {
    get readyState() {
      return state;
    },
    supported: true,
    get attempts() {
      return scheduler.attempts;
    },
    close(): void {
      if (closed) return;
      closed = true;
      scheduler.cancel();
      detach?.();
      detach = undefined;
      source?.close();
      source = undefined;
      setState(ConnectionState.Closed);
    },
  };
}
