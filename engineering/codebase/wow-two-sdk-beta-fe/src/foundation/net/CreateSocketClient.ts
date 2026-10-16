// A WebSocket client that fixes the three bugs every hand-rolled one has: dropped early sends, an
// intentional close that reconnects anyway, and a half-open socket nobody notices.
//
// (1) MESSAGES SENT WHILE `CONNECTING` ARE LOST. A `WebSocket` is not usable the moment it is constructed —
// the handshake takes a round trip, and `send()` during `CONNECTING` throws `InvalidStateError`. The bug is
// not the throw; it is that the throw happens in code that looks obviously correct (`const s =
// createSocket(); s.send(hello)`) and disappears on a fast local connection, so it ships. This client QUEUES
// anything sent before `OPEN` and flushes it, in order, on open — the same queue that covers sends during a
// reconnect, when the socket is `CONNECTING` again for seconds at a time.
//
// The queue is BOUNDED (`queueLimit`, default 100) and drops the OLDEST frame when full. Unbounded is not an
// option: a tab left open through an hour-long outage would otherwise accumulate every frame the app ever
// tried to send and hand the server all of them at once on reconnect. Oldest-first is the right end to drop
// for the state-update traffic sockets usually carry, where the newest frame supersedes the ones behind it —
// a caller whose messages are commands rather than state should keep `queueLimit` small and watch
// `queuedCount`.
//
// (2) AN INTENTIONAL `close()` MUST NOT RECONNECT. `onclose` fires for a network drop and for a deliberate
// close identically, so a reconnect handler wired to it fights every logout, unmount, and navigation — the
// socket keeps coming back, usually with the OLD credentials. A single `closedByCaller` flag, set before the
// close is requested, is the whole fix; every reconnect path checks it.
//
// (3) A HALF-OPEN SOCKET REPORTS `OPEN` FOREVER. When a peer vanishes without a close frame — a laptop lid, a
// dropped NAT entry, a killed load balancer — TCP has nothing to report, so `onclose` never fires and
// `readyState` stays `OPEN`. The connection is dead and the app cannot tell. The only detector is an
// application-level heartbeat: send a ping, require traffic back within a deadline, treat silence as death
// and reconnect. Note the ping MUST be application-level — the WebSocket protocol has real ping/pong frames,
// but browsers expose no API to send one, so a server-side-only heartbeat cannot be observed from here.
//
// ANY INBOUND FRAME CLEARS THE PONG DEADLINE, not just a frame matching some pong shape. A socket delivering
// data is alive by definition, so requiring a specific reply would kill healthy busy connections whose pong
// is merely queued behind other traffic. This also means a server needs no pong support at all for the
// heartbeat to be useful on a chatty socket.
//
// All reconnect delays come from `Reconnect.ts`, hence from `foundation/resilience`. None are computed here.

import { toError } from '../errors';
import type { RetryPolicy } from '../resilience';

import { ConnectionState, SocketReadyState } from './ConnectionState';
import { createReconnectScheduler } from './Reconnect';

/** The default cap on frames buffered while the socket is not open. */
const DefaultQueueLimit = 100;

/** The default ping frame — an application-level heartbeat, since browsers cannot send protocol pings. */
const DefaultPingFrame = (): string => JSON.stringify({ type: 'ping' });

/**
 * The minimal `WebSocket` surface this client drives. Narrow on purpose: a test double satisfies it in a few
 * lines, and the real `WebSocket` satisfies it structurally.
 */
export interface SocketConnection {
  /** The wire ready-state — see {@link SocketReadyState}. Gates every send. */
  readonly readyState: number;

  /** Sends one text frame. Throws while `CONNECTING`, which is exactly what the queue exists to prevent. */
  send(data: string): void;

  /** Starts the close handshake. */
  close(code?: number, reason?: string): void;

  /** Registers a listener for `open`, `close`, `error`, or `message`. */
  addEventListener(type: string, listener: (event: Event) => void): void;

  /** Removes a previously registered listener. */
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

/** Builds the underlying socket — injectable so tests and polyfills need no global. */
export type SocketFactory = (url: string, protocols?: string | ReadonlyArray<string>) => SocketConnection;

/** Configures the liveness heartbeat that detects a half-open socket. */
export interface SocketHeartbeatOptions {
  /** The interval (ms) between pings. */
  readonly intervalMs: number;

  /** The silence (ms) after a ping before the socket is declared dead and reconnected. Default: the interval. */
  readonly timeoutMs?: number;

  /** Builds the ping frame. Default `{"type":"ping"}`. Return the exact text your server expects. */
  readonly ping?: () => string;
}

/** Configures a {@link createSocketClient} call. Every member is optional. */
export interface SocketClientOptions<TIn = unknown, TOut = unknown> {
  /** The subprotocols offered during the handshake. */
  readonly protocols?: string | ReadonlyArray<string>;

  /** Receives every decoded inbound message. Frames that fail to decode go to {@link SocketClientOptions.onError}. */
  readonly onMessage?: (message: TIn, event: MessageEvent) => void;

  /** Fires each time the socket opens, including after every reconnect and BEFORE the queue is flushed. */
  readonly onOpen?: () => void;

  /** Fires on every close, with `wasClean` distinguishing a handshake close from a drop. */
  readonly onClose?: (event: CloseEvent) => void;

  /** Fires on a socket error, a decode failure, or a send that the transport rejected. */
  readonly onError?: (error: Error) => void;

  /** Fires on every connection-state transition — the seam for a "reconnecting…" indicator. */
  readonly onStateChange?: (state: ConnectionState) => void;

  /** Encodes an outbound message. Default `JSON.stringify`. */
  readonly serialize?: (message: TOut) => string;

  /** Decodes an inbound frame. Default `JSON.parse`. A throw here is reported, and the frame is dropped. */
  readonly deserialize?: (raw: string) => TIn;

  /** The reconnect policy, or `false` to never reconnect. Default `DefaultReconnectPolicy`. */
  readonly retry?: RetryPolicy | false;

  /** The half-open detector. Omit to disable heartbeating entirely. */
  readonly heartbeat?: SocketHeartbeatOptions;

  /** The cap on frames buffered while not open; the oldest is dropped when full. Default `100`. */
  readonly queueLimit?: number;

  /** The randomness feeding backoff jitter — injectable for deterministic tests. Default `Math.random`. */
  readonly random?: () => number;

  /** The socket factory. Default constructs a global `WebSocket`; inject a double in tests. */
  readonly socket?: SocketFactory;
}

/** Controls a live WebSocket connection. */
export interface SocketClient<TOut = unknown> {
  /** The current connection state. */
  readonly readyState: ConnectionState;

  /** Whether a `WebSocket` implementation was available at all; `false` under SSR, where the client is inert. */
  readonly supported: boolean;

  /** The number of frames buffered awaiting an open socket — non-zero means back-pressure or an outage. */
  readonly queuedCount: number;

  /** The consecutive reconnect attempts, zeroed on every successful open. */
  readonly attempts: number;

  /**
   * Sends a message, queueing it when the socket is not open yet.
   *
   * @param message - The payload, encoded by `serialize`.
   * @returns `true` when the frame went out immediately, `false` when it was queued or dropped.
   */
  send(message: TOut): boolean;

  /** Closes the socket, cancels reconnection permanently, clears the heartbeat, detaches all listeners. Idempotent. */
  close(code?: number, reason?: string): void;
}

/** Resolves the socket factory: the injected one, else the global `WebSocket`, else `undefined` (SSR / unsupported). */
function resolveSocketFactory(injected?: SocketFactory): SocketFactory | undefined {
  if (injected !== undefined) return injected;
  if (typeof WebSocket === 'undefined') return undefined;
  return (url, protocols) => new WebSocket(url, protocols as string | string[] | undefined);
}

/**
 * Opens a JSON WebSocket with a send queue, `resilience`-scheduled reconnection, and a half-open detector —
 * see this file's header for the three bugs each of those exists to prevent.
 *
 * Never throws, at import time or at call time. Where `WebSocket` does not exist (SSR) the returned client
 * reports `supported: false` and state `closed`, `send` returns `false`, and `close` is a no-op.
 *
 * @typeParam TIn - The decoded inbound message type.
 * @typeParam TOut - The outbound message type.
 * @param url - The socket endpoint (`ws://` or `wss://`).
 * @param options - Handlers, retry policy, heartbeat, codecs, and injection seams.
 * @returns The client handle. ALWAYS call `close()` when done — an abandoned socket keeps its connection, its
 * heartbeat timers, and every captured handler alive.
 */
export function createSocketClient<TIn = unknown, TOut = unknown>(
  url: string,
  options: SocketClientOptions<TIn, TOut> = {},
): SocketClient<TOut> {
  const {
    protocols,
    onMessage,
    onOpen,
    onClose,
    onError,
    onStateChange,
    serialize = (message: TOut) => JSON.stringify(message),
    deserialize = (raw: string) => JSON.parse(raw) as TIn,
    retry,
    heartbeat,
    queueLimit = DefaultQueueLimit,
    random,
    socket: socketFactory,
  } = options;

  const factory = resolveSocketFactory(socketFactory);
  const scheduler = createReconnectScheduler({ retry, random });

  /** Frames buffered while the socket is not `OPEN`, oldest first. */
  const queue: string[] = [];

  let state: ConnectionState = ConnectionState.Connecting;
  let connection: SocketConnection | undefined;
  let detach: (() => void) | undefined;
  let closedByCaller = false;
  let pingTimer: ReturnType<typeof setInterval> | undefined;
  let pongTimer: ReturnType<typeof setTimeout> | undefined;

  /** Publishes a state transition, skipping no-op repeats. */
  const setState = (next: ConnectionState): void => {
    if (state === next) return;
    state = next;
    try {
      onStateChange?.(next);
    } catch (error) {
      report(error);
    }
  };

  /** Reports an error, tolerating a throwing consumer handler — a bad listener must not break the transport. */
  const report = (error: unknown): void => {
    try {
      onError?.(toError(error));
    } catch {
      // Swallowed by contract: this runs from a DOM event handler, where a throw is unhandleable noise.
    }
  };

  /** Stops both heartbeat timers. Runs on every close and every drop, so neither can outlive its socket. */
  const stopHeartbeat = (): void => {
    if (pingTimer !== undefined) {
      clearInterval(pingTimer);
      pingTimer = undefined;
    }
    if (pongTimer !== undefined) {
      clearTimeout(pongTimer);
      pongTimer = undefined;
    }
  };

  /** Clears the pong deadline — called for ANY inbound frame, since traffic is proof of life. */
  const noteTraffic = (): void => {
    if (pongTimer !== undefined) {
      clearTimeout(pongTimer);
      pongTimer = undefined;
    }
  };

  /** Tears the current socket down and reconnects — the path for a drop, NOT for a caller's close. */
  const recycle = (): void => {
    if (closedByCaller) return;

    stopHeartbeat();
    // Detach BEFORE closing: our own `close` would otherwise fire the close handler, which would schedule a
    // second reconnect on top of this one.
    detach?.();
    detach = undefined;
    const dying = connection;
    connection = undefined;
    try {
      dying?.close();
    } catch {
      // A socket already dead rejects `close()` in some runtimes; nothing to recover.
    }

    const scheduled = scheduler.schedule(connect);
    setState(scheduled ? ConnectionState.Reconnecting : ConnectionState.Closed);
  };

  /** Starts the heartbeat for a freshly opened socket, if one is configured. */
  const startHeartbeat = (): void => {
    if (heartbeat === undefined) return;

    const { intervalMs, timeoutMs = heartbeat.intervalMs, ping = DefaultPingFrame } = heartbeat;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

    pingTimer = setInterval(() => {
      const live = connection;
      if (live === undefined || live.readyState !== SocketReadyState.Open) return;

      try {
        live.send(ping());
      } catch (error) {
        report(error);
      }

      // Arm the deadline only if one is not already running: back-to-back pings with no traffic between them
      // must not each reset the clock, or a dead socket is never detected.
      if (pongTimer !== undefined) return;
      pongTimer = setTimeout(() => {
        pongTimer = undefined;
        report(new Error(`The socket to ${url} missed its heartbeat; treating it as half-open.`));
        recycle();
      }, timeoutMs);
    }, intervalMs);
  };

  /** Writes every buffered frame in order on open. A rejected frame is reported and dropped, never re-queued. */
  const flushQueue = (target: SocketConnection): void => {
    const pending = queue.splice(0, queue.length);
    for (const frame of pending) {
      try {
        target.send(frame);
      } catch (error) {
        report(error);
      }
    }
  };

  /** Binds every listener to a socket and returns the matching detach — one closure so no listener can be missed. */
  const bind = (target: SocketConnection): (() => void) => {
    const bound: [type: string, listener: (event: Event) => void][] = [];

    /** Registers a listener and records it for the paired detach. */
    const on = (type: string, listener: (event: Event) => void): void => {
      target.addEventListener(type, listener);
      bound.push([type, listener]);
    };

    on('open', () => {
      scheduler.reset();
      setState(ConnectionState.Open);
      if (closedByCaller || connection !== target) return;
      try {
        onOpen?.();
      } catch (error) {
        report(error);
      }
      if (closedByCaller || connection !== target) return;
      // Flush AFTER `onOpen`, so a handler that sends a subscribe/auth frame on connect lands ahead of the
      // backlog rather than behind it — the ordering a protocol with a handshake requires.
      flushQueue(target);
      startHeartbeat();
    });

    on('message', (event) => {
      noteTraffic();
      if (onMessage === undefined) return;

      const message = event as MessageEvent;
      const data: unknown = message.data;
      if (typeof data !== 'string') {
        // Binary frames are out of scope for a JSON client; reporting beats silently dropping.
        report(new Error(`The socket to ${url} delivered a non-text frame, which this client cannot decode.`));
        return;
      }

      let decoded: TIn;
      try {
        decoded = deserialize(data);
      } catch (error) {
        report(error);
        return;
      }
      try {
        onMessage(decoded, message);
      } catch (error) {
        report(error);
      }
    });

    on('error', () => {
      // The `error` event carries no detail by design (it would leak cross-origin information). The close
      // that follows is what actually drives reconnection.
      report(new Error(`The socket to ${url} reported an error.`));
    });

    on('close', (event) => {
      stopHeartbeat();
      try {
        onClose?.(event as CloseEvent);
      } catch (error) {
        report(error);
      }
      if (closedByCaller) return;

      detach?.();
      detach = undefined;
      connection = undefined;

      const scheduled = scheduler.schedule(connect);
      setState(scheduled ? ConnectionState.Reconnecting : ConnectionState.Closed);
    });

    return () => {
      for (const entry of bound) target.removeEventListener(entry[0], entry[1]);
      bound.length = 0;
    };
  };

  /** Opens a socket and binds it; a constructor throw (a bad URL scheme) is reported and retried, not propagated. */
  function connect(): void {
    if (closedByCaller || factory === undefined) return;

    setState(scheduler.attempts === 0 ? ConnectionState.Connecting : ConnectionState.Reconnecting);

    let opened: SocketConnection;
    try {
      opened = factory(url, protocols);
    } catch (error) {
      report(error);
      const scheduled = scheduler.schedule(connect);
      setState(scheduled ? ConnectionState.Reconnecting : ConnectionState.Closed);
      return;
    }

    connection = opened;
    detach = bind(opened);
  }

  if (factory === undefined) {
    // Unsupported: a defined, inert answer. No throw, no listeners, no timers.
    state = ConnectionState.Closed;
    return {
      get readyState() {
        return state;
      },
      supported: false,
      get queuedCount() {
        return 0;
      },
      get attempts() {
        return 0;
      },
      send: () => false,
      close: () => undefined,
    };
  }

  connect();

  return {
    get readyState() {
      return state;
    },
    supported: true,
    get queuedCount() {
      return queue.length;
    },
    get attempts() {
      return scheduler.attempts;
    },

    send(message: TOut): boolean {
      // A closed client silently drops rather than buffering forever — nothing will ever flush the queue.
      if (closedByCaller) return false;

      let frame: string;
      try {
        frame = serialize(message);
      } catch (error) {
        report(error);
        return false;
      }

      const live = connection;
      if (live !== undefined && live.readyState === SocketReadyState.Open) {
        try {
          live.send(frame);
          return true;
        } catch (error) {
          // The socket claimed `OPEN` and refused anyway (a race with a close). Queue it for the reconnect
          // rather than losing it.
          report(error);
        }
      }

      queue.push(frame);
      if (queue.length > queueLimit) queue.splice(0, queue.length - queueLimit);
      return false;
    },

    close(code?: number, reason?: string): void {
      if (closedByCaller) return;
      // Set BEFORE requesting the close, so the `close` event this triggers sees the flag and stands down.
      closedByCaller = true;
      scheduler.cancel();
      stopHeartbeat();
      queue.length = 0;

      const dying = connection;
      connection = undefined;
      try {
        dying?.close(code, reason);
      } catch {
        // A socket already dead rejects `close()` in some runtimes; nothing to recover.
      }
      detach?.();
      detach = undefined;
      setState(ConnectionState.Closed);
    },
  };
}
