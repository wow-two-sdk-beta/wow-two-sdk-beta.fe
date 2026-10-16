// The cross-tab wire contract — the vocabulary every transport in this slice speaks, kept in its own module so
// the factory, the hooks, the leader election, and the in-memory test hub all agree on one shape.
//
// WHY AN ENVELOPE AND NOT A BARE MESSAGE: `BroadcastChannel` already refuses to deliver a tab its own message,
// but the `storage`-event fallback has no such rule — a write is visible to every listener that shares the
// origin, and in the fallback's own tab the listener would happily fire on its own write. Normalizing that
// difference needs a sender identity ON THE WIRE, so both transports wrap the payload the same way and the
// dispatch path filters `sender === self` once, for everyone. The envelope also carries `seq`, which does two
// jobs the timestamp cannot: it makes every write to the fallback's single storage key a distinct string (some
// browsers skip the `storage` event when `setItem` writes a byte-identical value), and it gives the receiver a
// stable identity for a duplicate dispatch.
//
// `TMessage` IS A COMPILE-TIME CONTRACT ONLY. A peer is another copy of the page, not a trusted caller — the
// envelope shape is validated at runtime, the payload inside it is not. A tab running an older bundle can put
// anything in `message`; a consumer that treats a channel as a security or integrity boundary is holding it
// wrong. Same-origin only, and only as trustworthy as the origin's own code.

import type { Guid } from '../identifiers';
import type { StorageBroker } from '../storage';

/**
 * Wraps one posted payload with the metadata the dispatch path needs — who sent it, in what order, and when.
 * Written to the wire by both real transports so the receiving rules are identical across them.
 */
export interface SyncEnvelope<TMessage> {
  /** Identifies the tab that posted the message; the receiver drops an envelope whose sender is itself. */
  readonly sender: Guid;

  /** Counts posts from this sender, starting at 0 — makes each fallback write unique and each delivery de-dupable. */
  readonly seq: number;

  /** Records the post time in epoch milliseconds, as read from the channel's clock. */
  readonly timestamp: number;

  /** Carries the caller's payload, unvalidated at runtime — see this file's header. */
  readonly message: TMessage;
}

/**
 * Receives a message from another tab. The payload comes first because it is what nearly every caller wants;
 * the envelope follows for the rare consumer that needs the sender or the ordering metadata.
 */
export type SyncListener<TMessage> = (message: TMessage, envelope: SyncEnvelope<TMessage>) => void;

/**
 * Names the delivery mechanisms a channel can sit on. `auto` picks the best one available and is the default;
 * the explicit values exist for tests and for a consumer that deliberately wants the weaker path.
 */
export const SyncTransport = {
  /** Requests the best mechanism available here; never the answer a channel reports back. */
  Auto: 'auto',

  /** Pins delivery to `BroadcastChannel` — real messages, no storage write per post. */
  Broadcast: 'broadcast',

  /** Pins delivery to the `storage` event — the weaker fallback, for browsers without `BroadcastChannel`. */
  Storage: 'storage',

  /** Pins delivery to nothing: posts are dropped and no listener ever fires. The SSR and test-double path. */
  Inert: 'inert',
} as const;

/** Names the delivery mechanisms a channel can sit on. */
export type SyncTransport = (typeof SyncTransport)[keyof typeof SyncTransport];

/** Names the transport a channel actually resolved to — `auto` is a request, never an answer. */
export type ResolvedSyncTransport = Exclude<SyncTransport, typeof SyncTransport.Auto>;

/** Defines the options that tune how a sync channel finds its peers. */
export interface SyncChannelOptions {
  /**
   * Selects the delivery mechanism; defaults to `auto` (`broadcast` → `storage` → `inert`). An explicit choice
   * that is unavailable in this environment degrades to the next one down rather than throwing.
   */
  readonly transport?: SyncTransport;

  /** Supplies the persistence seam the `storage` fallback writes through; defaults to `localStorageStorageBroker`. */
  readonly broker?: StorageBroker;

  /** Prefixes the `storage` fallback's key, isolating one app's channels from another's; defaults to `wow-two.sync`. */
  readonly keyPrefix?: string;

  /** Pins this endpoint's tab id instead of minting one — for deterministic tie-breaks in tests. */
  readonly id?: Guid;

  /** Supplies the clock stamped onto each envelope; defaults to `Date.now`. */
  readonly now?: () => number;
}

/**
 * Represents one tab's endpoint on a named cross-tab channel. Every method is total: posting on a closed
 * channel, subscribing after close, or running with no browser APIs at all are ordinary states that answer
 * quietly instead of throwing.
 */
export interface SyncChannel<TMessage> {
  /** Names the channel; every endpoint sharing this name on the origin is a peer. */
  readonly name: string;

  /** Identifies this endpoint (this tab) — stable for the channel's lifetime. */
  readonly id: Guid;

  /** Reports the mechanism this endpoint resolved to; `inert` means no peer will ever be reached. */
  readonly transport: ResolvedSyncTransport;

  /** Reports whether `close` has run — a closed channel neither sends nor delivers. */
  readonly closed: boolean;

  /** Sends `message` to every OTHER endpoint on the channel; never delivers to this one, and never throws. */
  post(message: TMessage): void;

  /** Registers `listener` for messages from other tabs; returns an idempotent disposer that unsubscribes it. */
  subscribe(listener: SyncListener<TMessage>): () => void;

  /** Detaches every listener and releases the underlying transport; idempotent. */
  close(): void;
}
