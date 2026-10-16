// net — foundation seam. The LONG-LIVED connection layer: Server-Sent Events (`createEventStream`),
// WebSockets (`createSocketClient`), interval polling (`createPoller`), and connectivity liveness
// (`waitForOnline`), each with a Vue binding.
//
// SCOPE BOUNDARY WITH `foundation/http` — READ BEFORE ADDING ANYTHING HERE. That slice owns REQUEST/RESPONSE:
// `createApiClient` is the HTTP client, and it already covers envelope unwrapping, `ProblemDetails` →
// `ApiError`, bearer and cookie auth, and the 401 hook. THIS SLICE IS NOT A SECOND HTTP CLIENT and must never
// grow into one. The split is by connection SHAPE, not by protocol:
//
//   - one request, one response, then done  → `foundation/http`
//   - a connection the server pushes down, or a loop the client repeats  → here
//
// So a `fetch` wrapper, a request interceptor, or anything that parses a `ProblemDetails` body belongs in
// `http`. `createPoller` deliberately takes an arbitrary `fn` rather than a URL for exactly this reason: it
// schedules work, it does not know how to make a request, and the `fn` a consumer passes is normally an
// `ApiClient` call. The two slices compose at the call site and share no code.
//
// EVERY FACTORY RETURNS A DISPOSER, AND NOTHING MAY LEAK. This slice's failure mode is not a wrong value, it
// is an accumulating one: a stream still connected after its route unmounted, an interval still pinging a
// socket that closed, a `visibilitychange` listener per poller ever created. Each of `createEventStream`,
// `createSocketClient`, and `createPoller` therefore tears down every timer, listener, and handle it created,
// and the tests assert `vi.getTimerCount() === 0` and a zeroed listener count after disposal rather than
// trusting the code to be careful.
//
// ALL RECONNECT BACKOFF COMES FROM `foundation/resilience`. `Reconnect.ts` is the only file that schedules a
// retry, and it computes no delay of its own — `computeRetryDelay` and `shouldRetry` decide everything.
//
// SSR-SAFE BY CONSTRUCTION. No `EventSource`, `WebSocket`, `document`, or `window` is touched at module
// scope; each is resolved inside the call that needs it. The three bindings go further and open nothing until
// `onMounted`, so an immediate watcher can never reach a platform global during a server render. Where the
// API is absent the answer is defined and inert — `supported: false`, state `closed`, disposers that no-op —
// never a throw an SSR render cannot catch.

export { ConnectionState, EventSourceReadyState, SocketReadyState } from './ConnectionState';

export {
  DefaultReconnectPolicy,
  createReconnectScheduler,
  type ReconnectScheduler,
  type ReconnectSchedulerOptions,
} from './Reconnect';

export {
  createEventStream,
  ReconnectOwner,
  type EventStream,
  type EventStreamErrorContext,
  type EventStreamHandlers,
  type EventStreamOptions,
  type EventStreamPayloads,
  type EventStreamSource,
  type EventStreamSourceFactory,
} from './CreateEventStream';

export { useEventStream, type EventStreamHandle } from './hooks/UseEventStream';

export {
  createSocketClient,
  type SocketClient,
  type SocketClientOptions,
  type SocketConnection,
  type SocketFactory,
  type SocketHeartbeatOptions,
} from './CreateSocketClient';

export { useSocket, type SocketHandle } from './hooks/UseSocket';

export { PollerState, createPoller, type PollFn, type Poller, type PollerOptions } from './CreatePoller';

export { usePolling, type PollingHandle } from './hooks/UsePolling';

export { readOnlineStatus, subscribeOnline, waitForOnline, type WaitForOnlineOptions } from './Liveness';
