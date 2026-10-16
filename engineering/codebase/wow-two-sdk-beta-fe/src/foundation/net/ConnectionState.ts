// The connection vocabulary shared by every long-lived transport in this slice, plus the two sets of WIRE
// ready-state numbers the platform uses.
//
// WHY A SEPARATE STATE FROM THE WIRE NUMBER: `EventSource.readyState` and `WebSocket.readyState` are both
// small integers, they overlap numerically, and they mean DIFFERENT things — `2` is `CLOSED` for an
// `EventSource` and `CLOSING` for a `WebSocket`. Worse, neither can express "the socket is down and this
// wrapper is waiting out a backoff delay before the next attempt", which is the state a UI most wants to
// render ("reconnecting…"). `EventSource` reports that situation as `CONNECTING`, indistinguishable from the
// very first connect. So consumers get this string union and never see a raw integer.
//
// WHY THE NUMBERS ARE SPELLED OUT HERE RATHER THAN READ OFF THE GLOBALS: `WebSocket.OPEN` is a static member
// of a class that does not exist under SSR, in a node test, or in a browser with the API disabled. Reading it
// at module scope is a `ReferenceError` at import time — the exact failure this slice promises never to have.
// The values are fixed by the WHATWG spec and cannot drift, so hardcoding them is both safe and the only
// SSR-correct option.

/** Describes a long-lived connection's state, uniformly across SSE, WebSocket, and polling. */
export const ConnectionState = {
  /** Refers to a first connection attempt in flight — nothing has been established yet. */
  Connecting: 'connecting',
  /** Refers to an established connection that is passing traffic. */
  Open: 'open',
  /** Refers to a dropped connection with a retry pending or in flight — what the wire ready-state cannot express. */
  Reconnecting: 'reconnecting',
  /** Refers to a connection down for good — closed by the caller, unsupported, or out of retries. */
  Closed: 'closed',
} as const;

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

/**
 * Provides the `EventSource.readyState` values from the WHATWG spec. Note `Closed` here is TERMINAL — the
 * browser only reports it once it has abandoned its own reconnection, which is precisely the signal
 * `createEventStream` waits for before taking the retry over.
 */
export const EventSourceReadyState = {
  /** Refers to the connection being established — including the browser's OWN automatic reconnection. */
  Connecting: 0,
  /** Refers to an open, streaming connection. */
  Open: 1,
  /** Refers to a connection the browser will not retry: a fatal error, or an explicit `close()`. */
  Closed: 2,
} as const;

/**
 * Provides the `WebSocket.readyState` values from the WHATWG spec — `Closing` occupies `2`, where
 * `EventSource` puts `Closed`.
 */
export const SocketReadyState = {
  /** Refers to a handshake in progress; `send()` throws here, which is why this slice queues instead. */
  Connecting: 0,
  /** Refers to an open socket ready for frames. */
  Open: 1,
  /** Refers to a close handshake in progress; frames sent now are discarded. */
  Closing: 2,
  /** Refers to a closed or failed socket. */
  Closed: 3,
} as const;
