// Vue binding for `createSyncChannel` — one channel per scope, torn down when the scope is disposed.
//
// THE LIFETIME RULE THIS ENFORCES: a channel holds a real `BroadcastChannel` (or a window listener), so a
// component that opens one and forgets it leaks a handle that keeps receiving after the tree is gone. Binding
// the channel to `onMounted` / `onScopeDispose` makes the disposal automatic.
//
// OPENED FROM `onMounted`, NEVER FROM AN IMMEDIATE WATCHER. `createSyncChannel` reaches for `BroadcastChannel`
// and, on the fallback path, `window`; an immediate watcher also runs during a server render, where neither
// exists. The channel is a client-only object, so `onMounted` is exactly the right seam.
//
// `onMessage` IS CALLED THROUGH THE CLOSURE, not captured into the subscription. A component's `setup` runs
// once, so the original's callback-in-a-ref indirection is unnecessary here — but the indirection is preserved
// in spirit: the subscription forwards to whatever `onMessage` is bound now, so the channel stays put.
//
// SAME REASONING FOR `options`, WITH A CAVEAT: they are read ONCE, when the channel opens. Changing `transport`,
// `broker`, or `keyPrefix` afterwards does NOT rebuild the channel — only `name` does. Options are
// configuration, not state; a consumer that genuinely needs to swap transports at runtime should remount with a
// `key`. This mirrors how `usePersistentState` pins its broker.

import { onMounted, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { createSyncChannel } from '../CreateSyncChannel';
import type { SyncChannel, SyncChannelOptions, SyncListener } from '../SyncChannel';

/**
 * Opens a cross-tab channel for the lifetime of the scope and subscribes `onMessage` to it.
 *
 * The returned `post` sends to every OTHER tab on the channel, never back into this one. Before mount and after
 * disposal — and under SSR, where no channel is ever opened — `post` is a silent no-op, so a handler firing at
 * an awkward moment needs no guard.
 *
 * @typeParam TMessage - The payload shape agreed between tabs.
 * @param name - Channel name; every tab using it on this origin is a peer. A ref or getter re-opens on change.
 * @param onMessage - Invoked for each message from another tab.
 * @param options - Transport and storage configuration, read once when the channel opens.
 * @returns The `post` function.
 */
export function useSyncChannel<TMessage>(
  name: MaybeRefOrGetter<string>,
  onMessage?: SyncListener<TMessage>,
  options?: SyncChannelOptions,
): (message: TMessage) => void {
  let channel: SyncChannel<TMessage> | null = null;
  let unsubscribe: (() => void) | undefined;

  function teardown(): void {
    unsubscribe?.();
    unsubscribe = undefined;
    channel?.close();
    channel = null;
  }

  function open(): void {
    teardown();

    const next = createSyncChannel<TMessage>(toValue(name), options);
    channel = next;

    // The subscription forwards rather than capturing, which is what lets the watcher depend on `name` alone.
    unsubscribe = next.subscribe((message, envelope) => {
      onMessage?.(message, envelope);
    });
  }

  onMounted(open);
  // Non-immediate on purpose: an immediate watcher runs on the server, where `BroadcastChannel` is absent.
  watch(() => toValue(name), open);
  onScopeDispose(teardown);

  return (message: TMessage): void => {
    channel?.post(message);
  };
}
