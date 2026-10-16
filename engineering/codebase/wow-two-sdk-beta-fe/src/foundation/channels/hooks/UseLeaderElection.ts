// Vue binding for `createLeaderElection` — joins on mount, resigns and leaves when the scope is disposed.
//
// WHY THE TEARDOWN PATH MATTERS MORE THAN USUAL: `close` resigns first, so a departing leader hands over in a
// claim window (~150ms) instead of leaving its peers to wait out the full lease (~3.5s) for a tab that is
// perfectly alive and simply navigating. The expiry path stays as the backstop for the tab that dies without
// ever running this cleanup.
//
// `isLeader` STARTS FALSE, ALWAYS. There is no election on the server, and no synchronous answer on the client
// either — a fresh participant is a candidate until its claim window closes. So the first paint is always a
// follower, and leadership arrives later. That makes the composable SSR-safe by construction (server and client
// agree on the first paint), and it is why the election is joined in `onMounted` rather than at setup:
// `createLeaderElection` opens a channel, which reaches for `BroadcastChannel` and `window`.
//
// Leader-only work therefore belongs in a `watch` on `isLeader`, never in a render branch that assumes the
// answer is settled.

import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import type { Guid } from '../../identifiers';

import { createLeaderElection, type LeaderElection, type LeaderElectionOptions } from '../LeaderElection';

/** Reports this tab's standing in an election, as reactive state. */
export interface LeaderElectionState {
  /** Reports whether this tab currently holds leadership; false before mount and under SSR. */
  readonly isLeader: Readonly<ShallowRef<boolean>>;

  /** Identifies this participant, or null before the election is joined (pre-mount, SSR). */
  readonly id: Readonly<ShallowRef<Guid | null>>;

  /** Surrenders leadership deliberately, handing over to a peer; a no-op when not leading. */
  readonly release: () => void;
}

/**
 * Joins the named leader election for the lifetime of the scope, updating when this tab gains or loses
 * leadership.
 *
 * Exactly one participating tab leads at a time; a tab that dies is superseded once its lease expires. Use it to
 * elect the single tab that opens the socket, runs the poll, or shows the notification.
 *
 * @param name - Election name; tabs sharing it on this origin compete for one leadership. A ref or getter
 *   re-joins on change.
 * @param options - Timing and channel configuration, read once when the election is joined.
 * @returns The current standing plus `release`.
 */
export function useLeaderElection(
  name: MaybeRefOrGetter<string>,
  options?: LeaderElectionOptions,
): LeaderElectionState {
  const isLeader = shallowRef(false);
  const id = shallowRef<Guid | null>(null);

  let election: LeaderElection | null = null;
  let offBecome: (() => void) | undefined;
  let offLose: (() => void) | undefined;

  function teardown(): void {
    offBecome?.();
    offLose?.();
    offBecome = undefined;
    offLose = undefined;
    election?.close();
    election = null;
    isLeader.value = false;
    id.value = null;
  }

  function join(): void {
    teardown();

    const next = createLeaderElection(toValue(name), options);
    election = next;

    // Publish the id immediately; leadership itself is decided later, by the transition callbacks.
    isLeader.value = next.isLeader;
    id.value = next.id;

    offBecome = next.onBecomeLeader(() => {
      isLeader.value = true;
      id.value = next.id;
    });
    offLose = next.onLoseLeader(() => {
      isLeader.value = false;
      id.value = next.id;
    });
  }

  onMounted(join);
  // Non-immediate on purpose: an immediate watcher runs on the server, where the channel's globals are absent.
  watch(() => toValue(name), join);
  onScopeDispose(teardown);

  const release = (): void => {
    election?.release();
  };

  return { isLeader, id, release };
}
