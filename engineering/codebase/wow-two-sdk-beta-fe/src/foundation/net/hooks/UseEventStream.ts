// Vue binding for `createEventStream` — one stream per scope, closed when the scope is disposed.
//
// THE LIFETIME RULE THIS ENFORCES: an `EventSource` is a live HTTP connection that outlives the component
// that opened it. Nothing about unmounting a tree closes it, so a route change away from a page holding an
// un-closed stream leaves the connection open, the handlers subscribed, and the reconnect timer armed — and
// navigating back opens a SECOND one. Binding the stream to `onMounted` / `onScopeDispose` makes the teardown
// automatic.
//
// OPENED FROM `onMounted`, NEVER FROM AN IMMEDIATE WATCHER. `createEventStream` resolves `EventSource` inside
// the call, and an immediate watcher also runs during a server render. `onMounted` is client-only by
// construction, so the SSR pass reports `closed` / `supported: true` and the stream opens at hydration.
//
// HANDLERS ARE READ THROUGH `toValue` AT CALL TIME, the Vue counterpart of the original's handlers-in-a-ref.
// A component's `setup` runs once, so a plain options object is already stable — but a caller that wants
// genuinely live handlers can pass a ref or getter and every callback re-reads it per event, with the stream
// itself staying put.
//
// OPTIONS ARE READ ONCE, when the stream opens. Changing `retry`, `events`, or `withCredentials` after mount
// does NOT rebuild the stream; only `url` does. Options are configuration, not state — a consumer that must
// genuinely swap them at runtime should remount with a `key`. This mirrors `useSyncChannel` in
// `foundation/channels`.
//
// A `null` URL MEANS "NOT YET", not "broken" — the shape every real app needs while it waits for a token or a
// route param. No stream is opened, and the state reads `closed`.

import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import { ConnectionState } from '../ConnectionState';
import {
  createEventStream,
  type EventStream,
  type EventStreamOptions,
  type EventStreamPayloads,
} from '../CreateEventStream';

/** The live view a scope gets over its stream. */
export interface EventStreamHandle {
  /** The current connection state, updating on every transition. */
  readonly readyState: Readonly<ShallowRef<ConnectionState>>;

  /** Whether `EventSource` exists in this runtime; `false` under SSR and in a locked-down browser. */
  readonly supported: Readonly<ShallowRef<boolean>>;

  /** Closes the stream early. The scope-disposal cleanup calls it anyway. */
  readonly close: () => void;
}

/**
 * Opens a Server-Sent Events stream for the lifetime of the scope.
 *
 * The stream is closed when the scope is disposed and re-opened whenever `url` changes. Pass `null` to hold
 * off connecting (waiting for auth, a route param, a feature flag) — a ref or getter is how that flips.
 *
 * @typeParam TEvents - Maps each server event name to its payload type.
 * @param url - The stream endpoint, or `null` to stay disconnected.
 * @param options - Handlers and configuration, read once when the stream opens; handler callbacks are re-read
 *   per event, so a ref or getter keeps them live.
 * @returns The connection state, support flag, and `close`.
 */
export function useEventStream<TEvents extends EventStreamPayloads = EventStreamPayloads>(
  url: MaybeRefOrGetter<string | null>,
  options: MaybeRefOrGetter<EventStreamOptions<TEvents>> = {},
): EventStreamHandle {
  const readyState = shallowRef<ConnectionState>(
    toValue(url) === null ? ConnectionState.Closed : ConnectionState.Connecting,
  );
  const supported = shallowRef(true);

  let stream: EventStream | null = null;

  function teardown(): void {
    stream?.close();
    stream = null;
  }

  function open(): void {
    teardown();

    const endpoint = toValue(url);
    if (endpoint === null) {
      readyState.value = ConnectionState.Closed;
      return;
    }

    const current = toValue(options);
    const next = createEventStream<TEvents>(endpoint, {
      ...current,
      // Every consumer callback is re-read through `toValue` at call time, which is what lets the watcher
      // depend on `url` alone. `onStateChange` is additionally intercepted to drive this scope's own state.
      onStateChange: (state) => {
        readyState.value = state;
        toValue(options).onStateChange?.(state);
      },
      onOpen: () => toValue(options).onOpen?.(),
      onError: (error, context) => toValue(options).onError?.(error, context),
      onMessage: (data, event) => toValue(options).onMessage?.(data, event),
    });

    stream = next;
    supported.value = next.supported;
    readyState.value = next.readyState;
  }

  onMounted(open);
  // Non-immediate on purpose: an immediate watcher runs on the server, where `EventSource` is absent.
  watch(() => toValue(url), open);
  onScopeDispose(teardown);

  const close = (): void => {
    stream?.close();
  };

  return { readyState, supported, close };
}
