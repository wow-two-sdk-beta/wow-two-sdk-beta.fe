// State that is LIVE-SHARED between open tabs and dies with the last one.
//
// PICKING BETWEEN THIS AND `usePersistentState` (`foundation/storage`) — they overlap by one line in a table and
// differ everywhere else:
//
//   | | `usePersistentState` | `useBroadcastState` |
//   |---|---|---|
//   | Where the value lives | `localStorage` (durable) | memory, in each tab (ephemeral) |
//   | Survives a reload / restart | yes | no — last tab closes, value is gone |
//   | Cross-tab sync | yes, as a side effect of the `storage` event | yes, deliberately, over the channel |
//   | Sync when `BroadcastChannel` exists | still the `storage` event | `BroadcastChannel` |
//   | Cost per update | a storage write | a message |
//   | Reaches a tab opened later | yes, it reads storage | yes, via the mount-time request/announce below |
//
// USE `usePersistentState` for anything the user would expect to still be there tomorrow — theme, collapsed
// sidebar, draft text, consent. USE THIS for state that is only meaningful while the tabs are open: which tab is
// playing audio, a live cursor position, "a sync is running", a wizard step mirrored across windows. Writing
// ephemeral state through `localStorage` leaves litter that outlives its meaning and re-appears, stale, on the
// next visit; persisting it is the actual bug that this composable exists to avoid.
//
// THE LATE-JOINER PROBLEM, AND THE FIX: a message-only mirror leaves a tab opened later holding `initial` while
// everyone else has moved on — it hears only FUTURE changes. So on mount this composable posts a `request`, and
// every tab already holding the value answers with an `announce`. With several peers, several answers arrive;
// they agree, so last-write-wins is harmless. A tab that opens when NO other tab is open keeps `initial`, which
// is correct — there is no shared value to inherit.
//
// NOT A CONFLICT-FREE TYPE. Two tabs writing in the same instant both broadcast, and each ends on whichever
// message it received last — the values can diverge. Fine for state with one natural writer at a time; wrong
// for a shared editable document, which needs a CRDT or a server, not a broadcast.
//
// THE CHANNEL OPENS IN `onMounted`, never at setup: `createSyncChannel` reaches for `BroadcastChannel` and
// `window`. Under SSR the value is simply `initial` and the setter is local, exactly as the original.

import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
  type WritableComputedRef,
} from 'vue';

import { createSyncChannel } from '../CreateSyncChannel';
import type { SyncChannel, SyncChannelOptions } from '../SyncChannel';

/** Prefixes the channel name so this composable's traffic cannot collide with a consumer's own channel. */
const ChannelPrefix = 'broadcast-state.';

/** Carries the mirror's traffic: a value announcement, or a late joiner asking to be caught up. */
type BroadcastStateSignal<T> =
  /** Publishes the sender's current value; every receiver adopts it. */
  | { readonly kind: 'announce'; readonly value: T }
  /** Asks peers to announce, so a tab that just opened can catch up. */
  | { readonly kind: 'request' };

/** A setter accepting a next value or an updater fn. */
export type SetBroadcastState<T> = (next: T | ((previous: T) => T)) => void;

/** The mirrored-state handle — a writable value plus the explicit setter it delegates to. */
export interface BroadcastStateControls<T> {
  /**
   * The mirrored value. Writable: `value.value = next` runs the same path as `setValue(next)`, so it drops
   * straight into `v-model`. The updater-fn form is `setValue`'s alone — a `v-model` write is always a value.
   */
  readonly value: WritableComputedRef<T>;

  /** Sets the next value locally and announces it to every peer. Accepts a value or an updater fn. */
  readonly setValue: SetBroadcastState<T>;
}

/**
 * Manages a piece of reactive state mirrored live across every open tab, without persisting it anywhere.
 *
 * Setting the value here sets it in every other tab holding the same `key`; a tab that opens later asks its
 * peers for the current value on mount. Nothing is written to storage, so the value vanishes when the last tab
 * closes — read this file's header for the split with `usePersistentState`, which is the durable counterpart.
 *
 * SSR-safe: no channel is opened on the server, so the value is simply `initial` and the setter is local.
 *
 * @typeParam T - The mirrored value; must survive the transport (JSON-only on the `storage` fallback).
 * @param key - Identifies the shared value; tabs sharing it on this origin mirror each other. A ref or getter
 *   re-opens the channel on change.
 * @param initial - The value before any peer answers, and the value when no other tab is open. Read once.
 * @param options - Channel configuration, read once when the channel opens.
 * @returns The writable value and its setter.
 */
export function useBroadcastState<T>(
  key: MaybeRefOrGetter<string>,
  initial: T,
  options?: SyncChannelOptions,
): BroadcastStateControls<T> {
  // Cast: `shallowRef`'s return type is a conditional over an unresolved `T`, which leaves `.value`
  // unassignable until `T` is known. The cast pins it to the shape it always has here — same as `useControlled`.
  const current = shallowRef(initial) as ShallowRef<T>;

  let currentKey = toValue(key);
  let mounted = false;
  let channel: SyncChannel<BroadcastStateSignal<T>> | null = null;
  let unsubscribe: (() => void) | undefined;

  function teardown(): void {
    unsubscribe?.();
    unsubscribe = undefined;
    channel?.close();
    channel = null;
  }

  function open(): void {
    teardown();

    const nextKey = toValue(key);
    if (nextKey !== currentKey) {
      current.value = initial;
      currentKey = nextKey;
    }
    if (!mounted) return;
    const next = createSyncChannel<BroadcastStateSignal<T>>(`${ChannelPrefix}${nextKey}`, options);
    channel = next;

    unsubscribe = next.subscribe((signal) => {
      if (typeof signal !== 'object' || signal === null) return;

      if (signal.kind === 'announce') {
        current.value = signal.value;
        return;
      }

      // A peer just opened and is asking to be caught up; answer with what this tab holds.
      if (signal.kind === 'request') next.post({ kind: 'announce', value: current.value });
    });

    next.post({ kind: 'request' });
  }

  onMounted(() => {
    mounted = true;
    open();
  });
  // Reset synchronously at key changes; platform channels only open after mount.
  watch(() => toValue(key), open, { flush: 'sync' });
  onScopeDispose(() => {
    mounted = false;
    teardown();
  });

  const setValue: SetBroadcastState<T> = (next) => {
    // Resolved against the current value before the write, so the broadcast is never a side effect inside a
    // reactive setter that something else might re-run.
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current.value) : next;

    current.value = resolved;
    channel?.post({ kind: 'announce', value: resolved });
  };

  const value = computed<T>({
    get: () => current.value,
    set: setValue,
  });

  return { value, setValue };
}
