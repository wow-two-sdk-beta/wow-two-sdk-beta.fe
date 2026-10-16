// Exactly one tab does the work. The recurring cross-tab problem this solves: five open tabs each opening a
// WebSocket, each running the same poll, each firing the same notification. Electing a leader lets four of them
// stand down, and — the part that is easy to get wrong — lets one of them take over when the leader dies.
//
// WHY NOT `navigator.locks`: `LockManager.request` is the browser's own answer and is genuinely better where it
// exists — the lock is released by the browser itself when the tab dies, with no timeout and no heartbeat. It is
// also absent from every Safari before 15.4 and from every non-secure context, and it cannot express "tell me
// when I've LOST leadership" without holding a promise open. This implementation needs neither, rides on the
// same channel as the rest of the slice, and works wherever a message can be delivered.
//
// THE ALGORITHM, and why it is shaped this way:
//   - CLAIM WINDOW. A starting tab does not wait out the full timeout to discover whether a leader exists; it
//     posts a `claim` and listens for `claimWindow` ms. A live leader answers with a heartbeat and the claimant
//     stands down. Silence means the throne is empty. Startup therefore costs ~150ms, not ~3.5s.
//   - TIE-BREAK: LOWEST ID WINS. Two tabs claiming in the same window each see the other's claim, and both
//     apply the same total order, so exactly one concludes it won — no extra round-trip, no coin flip. Ids are
//     UUIDv7 (`createSyncChannel`), which is TIME-ORDERED: lowest id = earliest-created tab. So the rule is not
//     arbitrary, it is "the tab that has been open longest leads", which is also the tab most likely to hold
//     warm state.
//   - HEARTBEAT + EXPIRY IS THE WHOLE POINT. A tab that is killed — process crash, force-quit, OOM, laptop lid,
//     `pagehide` never firing — cannot announce anything. So leadership is a LEASE, not a grant: the leader
//     re-asserts every `heartbeatInterval`, and any follower that sees nothing for `timeout` presumes it dead
//     and claims. Without this the whole slice would deadlock on its first crash, which is the failure mode
//     leader election exists to prevent.
//   - SPLIT BRAIN HEALS. Two leaders can coexist briefly (a channel partition, a suspended-then-resumed tab
//     whose lease expired elsewhere). On hearing a rival heartbeat the higher id steps down; the lower re-asserts.
//
// INVARIANT ON THE TIMINGS: `timeout` must exceed `heartbeatInterval` by a comfortable multiple — the default
// 3500 / 1000 tolerates two dropped or delayed heartbeats. Set them too close and a merely busy main thread
// (a long task, a background-throttled timer) reads as a crash and leadership flaps. Not clamped, because a
// test legitimately wants tight values; stated because a consumer legitimately gets it wrong.
//
// SAFETY, NOT LIVENESS-AT-ANY-COST: during a partition each side may elect its own leader. This is a UI
// coordination tool — use it to suppress duplicate work, never as a distributed lock over something that must
// not happen twice.

import { Guid } from '../identifiers';

import { createSyncChannel } from './CreateSyncChannel';
import type { SyncChannel, SyncChannelOptions } from './SyncChannel';

/** Prefixes the election's channel name so it cannot collide with a consumer's own channel of the same name. */
const ChannelPrefix = 'leader.';

/** Re-asserts leadership this often, in milliseconds. */
const DefaultHeartbeatInterval = 1_000;

/** Presumes the leader dead after this long without a heartbeat, in milliseconds — ~3 missed beats. */
const DefaultTimeout = 3_500;

/** Collects rival claims for this long before concluding an election, in milliseconds. */
const DefaultClaimWindow = 150;

/**
 * Carries the election's traffic. Each signal repeats its sender's id in the payload rather than relying on the
 * envelope, so the messages stay self-describing when read in devtools or replayed through another transport.
 */
export type LeaderSignal =
  /** Asserts live leadership; resets every follower's expiry watchdog. */
  | { readonly kind: 'heartbeat'; readonly id: Guid }
  /** Announces a bid for the empty throne; a live leader answers it with a heartbeat. */
  | { readonly kind: 'claim'; readonly id: Guid }
  /** Surrenders leadership deliberately, so peers re-elect at once instead of waiting out the expiry. */
  | { readonly kind: 'resign'; readonly id: Guid };

/** Names a participant's position in the election. */
export const LeaderRole = {
  /** Watches a live leader's heartbeat and re-elects when the lease expires. The state every tab starts in. */
  Follower: 'follower',

  /** Has bid for the empty throne and is waiting out the claim window for a rival or a live leader. */
  Candidate: 'candidate',

  /** Holds the lease and does the work; heartbeats until it resigns, closes, or crashes. */
  Leader: 'leader',
} as const;

/** Names a participant's position in the election. */
export type LeaderRole = (typeof LeaderRole)[keyof typeof LeaderRole];

/** Defines the options that tune an election's timing and transport. */
export interface LeaderElectionOptions {
  /** Sets how often the leader re-asserts, in milliseconds; defaults to 1000. */
  readonly heartbeatInterval?: number;

  /** Sets how long a follower tolerates silence before claiming, in milliseconds; defaults to 3500. */
  readonly timeout?: number;

  /** Sets how long a candidate collects rival claims, in milliseconds; defaults to 150. */
  readonly claimWindow?: number;

  /**
   * Supplies the channel to run on instead of opening one — the seam tests use to join a `memorySyncHub`. An
   * injected channel is NOT closed by `close`; its owner keeps that duty.
   */
  readonly channel?: SyncChannel<LeaderSignal>;

  /** Tunes the channel opened when `channel` is omitted; ignored when one is supplied. */
  readonly channelOptions?: SyncChannelOptions;
}

/** Represents this tab's participation in a named election. */
export interface LeaderElection {
  /** Identifies this participant — the same id as the underlying channel's endpoint. */
  readonly id: Guid;

  /** Reports whether this tab currently holds the lease. */
  readonly isLeader: boolean;

  /** Reports this tab's position — `candidate` is the transient state inside a claim window. */
  readonly role: LeaderRole;

  /**
   * Registers `listener` for the moment this tab takes leadership. Fires IMMEDIATELY and synchronously if it is
   * already the leader when subscribing, so a late subscriber cannot miss the transition it was waiting for.
   *
   * @param listener - Invoked on becoming leader; a throw is swallowed.
   * @returns An idempotent disposer.
   */
  onBecomeLeader(listener: () => void): () => void;

  /**
   * Registers `listener` for the moment this tab loses leadership — superseded by a lower id, or after
   * `release`. Not fired by `close`, which is a teardown rather than a state change.
   *
   * @param listener - Invoked on losing leadership; a throw is swallowed.
   * @returns An idempotent disposer.
   */
  onLoseLeader(listener: () => void): () => void;

  /**
   * Surrenders leadership deliberately and tells peers to re-elect at once. This tab stays in the election and
   * may win again later — typically after `timeout`, by which point a peer has long since taken over.
   */
  release(): void;

  /**
   * Leaves the election entirely: resigns first if leading, then drops every timer and listener. Idempotent.
   * Does not fire `onLoseLeader`. Closes the underlying channel only when this election opened it.
   */
  close(): void;
}

/**
 * Joins the named election, in which exactly one participating tab holds leadership at a time.
 *
 * Leadership is a lease kept alive by a heartbeat, so a tab that dies without resigning is superseded once its
 * lease expires — the reclaim path is the reason this exists. Ties are broken by lowest id, which for the
 * time-ordered v7 ids minted here means the longest-open tab wins. Starts campaigning immediately; nothing
 * throws, and under SSR or with no cross-tab transport the sole participant simply becomes leader.
 *
 * @param name - Election name; tabs sharing it on the origin compete for one leadership.
 * @param options - Timing, and the channel to run on.
 * @returns The participant handle: state, transition events, `release`, and `close`.
 */
export function createLeaderElection(name: string, options?: LeaderElectionOptions): LeaderElection {
  const heartbeatInterval = options?.heartbeatInterval ?? DefaultHeartbeatInterval;
  const timeout = options?.timeout ?? DefaultTimeout;
  const claimWindow = options?.claimWindow ?? DefaultClaimWindow;

  const ownsChannel = options?.channel === undefined;
  const channel =
    options?.channel ?? createSyncChannel<LeaderSignal>(`${ChannelPrefix}${name}`, options?.channelOptions);

  // One identity per tab: the election reuses the channel endpoint's id rather than minting a second one, so a
  // consumer correlating a message's sender with a leader's id sees the same value.
  const id = channel.id;

  const becomeListeners = new Set<() => void>();
  const loseListeners = new Set<() => void>();

  let role: LeaderRole = LeaderRole.Follower;
  let closed = false;

  let claimTimer: ReturnType<typeof setTimeout> | undefined;
  let watchTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  // Per-campaign scratch, reset at the start of every claim window.
  let lowestRival: Guid | null = null;
  let leaderSeenDuringClaim = false;

  /** Runs a listener without letting its failure escape into a timer or an event dispatch. */
  function safeInvoke(listener: () => void): void {
    try {
      listener();
    } catch {
      // A consumer's callback must not break the election's own state machine.
    }
  }

  /** Fans a transition out over a snapshot, so a listener that unsubscribes mid-emit cannot corrupt the walk. */
  function emit(listeners: ReadonlySet<() => void>): void {
    for (const listener of [...listeners]) safeInvoke(listener);
  }

  /** Stops the follower's expiry watchdog. */
  function clearWatch(): void {
    if (watchTimer !== undefined) clearTimeout(watchTimer);
    watchTimer = undefined;
  }

  /** Stops the pending claim resolution. */
  function clearClaim(): void {
    if (claimTimer !== undefined) clearTimeout(claimTimer);
    claimTimer = undefined;
  }

  /** Stops the leader's heartbeat. */
  function clearHeartbeat(): void {
    if (heartbeatTimer !== undefined) clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }

  /** (Re)arms the expiry watchdog — every heartbeat heard pushes the presumed-dead deadline out. */
  function armWatch(): void {
    clearWatch();
    if (closed) return;
    watchTimer = setTimeout(beginClaim, timeout);
  }

  /** Drops to follower and resumes watching for a leader. */
  function toFollower(): void {
    role = LeaderRole.Follower;
    armWatch();
  }

  /** Opens a campaign: announce the bid, then judge the responses once the window closes. */
  function beginClaim(): void {
    if (closed || role === LeaderRole.Leader) return;

    clearWatch();
    clearClaim();

    role = LeaderRole.Candidate;
    lowestRival = null;
    leaderSeenDuringClaim = false;

    channel.post({ kind: 'claim', id });
    claimTimer = setTimeout(resolveClaim, claimWindow);
  }

  /** Closes the campaign: a live leader or a lower-id rival beats this tab; otherwise it takes the lease. */
  function resolveClaim(): void {
    claimTimer = undefined;
    if (closed || role !== LeaderRole.Candidate) return;

    if (leaderSeenDuringClaim) {
      toFollower();
      return;
    }

    // The total order every candidate applies identically — so exactly one of them concludes it won.
    if (lowestRival !== null && Guid.compare(lowestRival, id) < 0) {
      toFollower();
      return;
    }

    becomeLeader();
  }

  /** Takes the lease: assert it at once, then keep it alive. */
  function becomeLeader(): void {
    if (closed) return;

    role = LeaderRole.Leader;
    clearWatch();
    clearClaim();

    channel.post({ kind: 'heartbeat', id });
    heartbeatTimer = setInterval(() => channel.post({ kind: 'heartbeat', id }), heartbeatInterval);

    emit(becomeListeners);
  }

  /** Gives up the lease and returns to watching, announcing the transition. */
  function stepDown(): void {
    clearHeartbeat();
    role = LeaderRole.Follower;
    armWatch();
    emit(loseListeners);
  }

  const unsubscribe = channel.subscribe((signal) => {
    if (closed) return;

    // A peer on an older bundle could send anything; the union is a compile-time contract only.
    if (typeof signal !== 'object' || signal === null) return;

    switch (signal.kind) {
      case 'heartbeat': {
        if (role === LeaderRole.Leader) {
          // Split brain. Both sides apply the same rule, so it resolves in one exchange: the higher id yields,
          // the lower re-asserts to the tab that has just stood down.
          if (Guid.compare(signal.id, id) < 0) stepDown();
          else channel.post({ kind: 'heartbeat', id });
          return;
        }

        leaderSeenDuringClaim = true;
        if (role === LeaderRole.Candidate) {
          clearClaim();
          role = LeaderRole.Follower;
        }
        armWatch();
        return;
      }

      case 'claim': {
        // Answering a claim is what makes a live leader discoverable in `claimWindow` instead of `timeout`.
        if (role === LeaderRole.Leader) {
          channel.post({ kind: 'heartbeat', id });
          return;
        }

        if (role === LeaderRole.Candidate && (lowestRival === null || Guid.compare(signal.id, lowestRival) < 0)) {
          lowestRival = signal.id;
        }
        return;
      }

      case 'resign': {
        // The graceful path: re-elect now rather than waiting out a lease nobody is holding.
        if (role !== LeaderRole.Leader) beginClaim();
        return;
      }
    }
  });

  beginClaim();

  return {
    id,

    get isLeader(): boolean {
      return role === LeaderRole.Leader;
    },

    get role(): LeaderRole {
      return role;
    },

    onBecomeLeader(listener: () => void): () => void {
      if (closed) return () => undefined;

      becomeListeners.add(listener);
      // Replay the current state: a subscriber attaching after the campaign resolved would otherwise wait for a
      // transition that has already happened.
      if (role === LeaderRole.Leader) safeInvoke(listener);

      return () => {
        becomeListeners.delete(listener);
      };
    },

    onLoseLeader(listener: () => void): () => void {
      if (closed) return () => undefined;

      loseListeners.add(listener);
      return () => {
        loseListeners.delete(listener);
      };
    },

    release(): void {
      if (closed) return;

      if (role === LeaderRole.Leader) {
        // Step down BEFORE announcing. A peer that hears `resign` claims immediately, and with a synchronous
        // transport that claim arrives while this tab is still on the wire — a leader would answer it with a
        // heartbeat, the claimant would abort, and the handover would be lost until the lease expired.
        stepDown();
        channel.post({ kind: 'resign', id });
        return;
      }

      clearClaim();
      toFollower();
    },

    close(): void {
      if (closed) return;

      // Resign before going quiet, so peers re-elect immediately instead of waiting out this tab's lease. A tab
      // that is KILLED cannot do this — that case is the expiry path's job.
      if (role === LeaderRole.Leader) channel.post({ kind: 'resign', id });

      closed = true;
      role = LeaderRole.Follower;
      clearWatch();
      clearClaim();
      clearHeartbeat();
      unsubscribe();
      becomeListeners.clear();
      loseListeners.clear();

      if (ownsChannel) channel.close();
    },
  };
}
