// Vue binding for `createSocketClient` — one socket per scope, closed when the scope is disposed.
//
// THE LIFETIME RULE THIS ENFORCES: a `WebSocket` abandoned by its component stays connected, keeps its
// heartbeat interval running, and keeps reconnecting on backoff — forever, since nothing else holds a
// reference with which to close it. In an SPA that is one leaked socket per visit to the page, and the server
// sees the connection count climb with no matching users. Binding the client to `onMounted` /
// `onScopeDispose` makes the teardown automatic.
//
// OPENED FROM `onMounted`, NEVER FROM AN IMMEDIATE WATCHER. `createSocketClient` resolves `WebSocket` inside
// the call, and an immediate watcher also runs during a server render, where that global does not exist.
//
// THE RETURNED `send` IS ALWAYS SAFE TO CALL. It reads the current client from the closure, so it never goes
// stale, and it works BEFORE the socket finishes connecting — the client's queue is what makes that true (see
// `CreateSocketClient.ts`, bug 1). Calling it after disposal is a no-op rather than a crash, which matters
// because an in-flight event handler routinely outlives the tree.
//
// HANDLERS ARE READ THROUGH `toValue` AT CALL TIME, options are read once, and a `null` URL means "not yet" —
// same three rules as `useEventStream`, for the same reasons.

import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import { ConnectionState } from '../ConnectionState';
import { createSocketClient, type SocketClient, type SocketClientOptions } from '../CreateSocketClient';

/** The live view a scope gets over its socket. */
export interface SocketHandle<TOut> {
  /** The current connection state, updating on every transition. */
  readonly readyState: Readonly<ShallowRef<ConnectionState>>;

  /** Whether `WebSocket` exists in this runtime; `false` under SSR. */
  readonly supported: Readonly<ShallowRef<boolean>>;

  /**
   * Sends a message, queueing it while the socket is still connecting.
   *
   * @returns `true` when the frame went out immediately, `false` when queued, dropped, or disposed.
   */
  readonly send: (message: TOut) => boolean;

  /** Closes the socket early and suppresses reconnection. The scope-disposal cleanup calls it anyway. */
  readonly close: () => void;
}

/**
 * Opens a JSON WebSocket for the lifetime of the scope.
 *
 * The socket is closed when the scope is disposed and re-opened whenever `url` changes. Pass `null` to hold
 * off connecting (waiting for auth, a route param, a feature flag) — a ref or getter is how that flips.
 *
 * @typeParam TIn - The decoded inbound message type.
 * @typeParam TOut - The outbound message type.
 * @param url - The socket endpoint, or `null` to stay disconnected.
 * @param options - Handlers and configuration, read once when the socket opens; handler callbacks are re-read
 *   per message, so a ref or getter keeps them live.
 * @returns The connection state, support flag, and `send` / `close`.
 */
export function useSocket<TIn = unknown, TOut = unknown>(
  url: MaybeRefOrGetter<string | null>,
  options: MaybeRefOrGetter<SocketClientOptions<TIn, TOut>> = {},
): SocketHandle<TOut> {
  const readyState = shallowRef<ConnectionState>(
    toValue(url) === null ? ConnectionState.Closed : ConnectionState.Connecting,
  );
  const supported = shallowRef(true);

  let client: SocketClient<TOut> | null = null;

  function teardown(): void {
    client?.close();
    client = null;
  }

  function open(): void {
    teardown();

    const endpoint = toValue(url);
    if (endpoint === null) {
      readyState.value = ConnectionState.Closed;
      return;
    }

    const current = toValue(options);
    const next = createSocketClient<TIn, TOut>(endpoint, {
      ...current,
      // Every consumer callback is re-read through `toValue` at call time, which is what lets the watcher
      // depend on `url` alone. `onStateChange` is additionally intercepted to drive this scope's own state.
      onStateChange: (state) => {
        readyState.value = state;
        toValue(options).onStateChange?.(state);
      },
      onOpen: () => toValue(options).onOpen?.(),
      onClose: (event) => toValue(options).onClose?.(event),
      onError: (error) => toValue(options).onError?.(error),
      onMessage: (message, event) => toValue(options).onMessage?.(message, event),
    });

    client = next;
    supported.value = next.supported;
    readyState.value = next.readyState;
  }

  onMounted(open);
  // Non-immediate on purpose: an immediate watcher runs on the server, where `WebSocket` is absent.
  watch(() => toValue(url), open);
  onScopeDispose(teardown);

  const send = (message: TOut): boolean => client?.send(message) ?? false;

  const close = (): void => {
    client?.close();
  };

  return { readyState, supported, send, close };
}
