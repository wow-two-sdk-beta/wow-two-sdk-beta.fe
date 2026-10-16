// The channel factory and its three transports. One dispatch path serves all of them, which is the whole point:
// the receiving RULES (drop your own message, drop a duplicate, never let a listener's throw escape) live here
// once, and a transport only has to move bytes.
//
// TRANSPORT LADDER (`auto`): `BroadcastChannel` → `storage` event → inert. Each rung is strictly weaker than the
// one above, and a rung that is unavailable falls through instead of throwing — an explicit `transport:
// 'broadcast'` in a browser without it still yields a working channel, just a lesser one.
//
// THE `storage` FALLBACK IS A GENUINE DOWNGRADE, not a polyfill. Its known weaknesses, all inherent:
//   - JSON only. The envelope round-trips through `StorageBroker`, so a `Map`, `Set`, `Date`, `undefined`,
//     cyclic object, or `ArrayBuffer` does not survive — `BroadcastChannel` structured-clones all of those.
//   - Same-origin only, like `localStorage` itself. (`BroadcastChannel` is also same-origin, so this one is a
//     wash — stated because consumers ask.)
//   - Each storage event carries its own newValue; reading the current key would lose earlier burst messages.
//   - Delivery is best-effort and unordered across senders; there is no ack and no queue.
//   - The last envelope is left in storage on purpose. Removing it would fire a second `storage` event in every
//     peer for no payload, and nothing reads the key on join.
//   - Blocked storage (Safari private mode, a sandboxed iframe, quota) degrades the write to a silent no-op —
//     the broker already swallows it, so the channel simply delivers nothing.
//
// WHY `post` HAS A `try`: `BroadcastChannel.postMessage` throws `DataCloneError` for a payload the structured
// clone algorithm rejects — a function, a DOM node, a class instance with a live handle. That is the one place
// a caller could otherwise be surprised by a throw from this slice, and the contract says nothing here throws.

import { Guid } from '../identifiers';
import { localStorageStorageBroker, type StorageBroker } from '../storage';

import type { ResolvedSyncTransport, SyncChannel, SyncChannelOptions, SyncEnvelope, SyncListener } from './SyncChannel';

/** Namespaces the `storage` fallback's keys so one app's channels never collide with another's on a shared origin. */
const DefaultKeyPrefix = 'wow-two.sync';

/** Moves envelopes for one channel; the strategy behind a `SyncChannel`, chosen once at construction. */
interface TransportBinding {
  /** Names the mechanism, surfaced as `channel.transport`. */
  readonly kind: ResolvedSyncTransport;

  /** Puts one envelope on the wire; swallows every failure. */
  send(envelope: SyncEnvelope<unknown>): void;

  /** Releases listeners and handles; idempotent. */
  dispose(): void;
}

/** Confirms a value carries the envelope's metadata; the payload inside is NOT validated (see `SyncChannel.ts`). */
function isEnvelope(value: unknown): value is SyncEnvelope<unknown> {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as { sender?: unknown; seq?: unknown; timestamp?: unknown };
  return (
    typeof candidate.sender === 'string' &&
    typeof candidate.seq === 'number' &&
    Number.isSafeInteger(candidate.seq) &&
    candidate.seq >= 0 &&
    typeof candidate.timestamp === 'number' &&
    Number.isFinite(candidate.timestamp) &&
    'message' in candidate
  );
}

/**
 * Reads the `key` off a `storage` event without assuming a complete `StorageEvent` — a partial fake is a
 * realistic input.
 */
function readEventKey(event: Event): string | null {
  const candidate = (event as Event & { readonly key?: unknown }).key;
  return typeof candidate === 'string' ? candidate : null;
}

/** Resolves `window`, or null under SSR — mirrors `StorageBroker`'s guard, including the throwing-getter case. */
function resolveWindow(): Window | null {
  if (typeof window === 'undefined') return null;

  try {
    return typeof window.addEventListener === 'function' ? window : null;
  } catch {
    return null;
  }
}

/** Binds a real `BroadcastChannel`, or null when the API is absent (SSR, older Safari). */
function bindBroadcast(name: string, onEnvelope: (raw: unknown) => void): TransportBinding | null {
  if (typeof BroadcastChannel === 'undefined') return null;

  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(name);
  } catch {
    // A hostile or partial implementation — fall through to the next rung rather than fail construction.
    return null;
  }

  const onMessage = (event: MessageEvent): void => onEnvelope(event.data);
  channel.addEventListener('message', onMessage);

  return {
    kind: 'broadcast',
    send(envelope) {
      try {
        channel.postMessage(envelope);
      } catch {
        // `DataCloneError` for a non-cloneable payload, or a closed channel — see this file's header.
      }
    },
    dispose() {
      try {
        channel.removeEventListener('message', onMessage);
        channel.close();
      } catch {
        // Already torn down by a navigation — nothing to recover.
      }
    },
  };
}

/** Binds the `storage`-event fallback over a `StorageBroker`, or null under SSR. */
function bindStorage(key: string, broker: StorageBroker, onEnvelope: (raw: unknown) => void): TransportBinding | null {
  const view = resolveWindow();
  if (view === null) return null;

  // The event says only THAT the key changed; the value is read back through the broker rather than off
  // `event.newValue`, so a broker with its own encoding (namespaced, versioned) stays the single source of
  // truth for what a stored value means. The cost is a race — a second write landing before this read wins,
  // and the first envelope is dropped, which the `seq` de-dupe turns into a loss rather than a duplicate.
  const onStorage = (event: Event): void => {
    if (readEventKey(event) !== key) return;
    const raw = (event as StorageEvent).newValue;
    if (typeof raw === 'string') {
      try {
        onEnvelope(JSON.parse(raw));
      } catch {
        /* Ignore malformed transport data. */
      }
    } else if (raw === undefined) onEnvelope(broker.read<unknown>(key));
  };

  view.addEventListener('storage', onStorage);

  return {
    kind: 'storage',
    send(envelope) {
      broker.write(key, envelope);
    },
    dispose() {
      view.removeEventListener('storage', onStorage);
    },
  };
}

/** The no-peer binding — SSR, or a browser with neither mechanism. Sends nowhere and receives nothing. */
const inertBinding: TransportBinding = {
  kind: 'inert',
  send() {
    // No peers exist; a single-tab app behaves correctly with every message dropped.
  },
  dispose() {
    // Nothing was ever attached.
  },
};

/** Walks the transport ladder from the requested rung down, returning the first binding that attaches. */
function bind(
  requested: SyncChannelOptions['transport'],
  name: string,
  key: string,
  broker: StorageBroker,
  onEnvelope: (raw: unknown) => void,
): TransportBinding {
  if (requested === 'inert') return inertBinding;
  if (requested === 'storage') return bindStorage(key, broker, onEnvelope) ?? inertBinding;
  if (requested === 'broadcast') return bindBroadcast(name, onEnvelope) ?? inertBinding;

  return bindBroadcast(name, onEnvelope) ?? bindStorage(key, broker, onEnvelope) ?? inertBinding;
}

/**
 * Opens this tab's endpoint on the named cross-tab channel. Messages posted here reach every other tab on the
 * same origin with a channel of the same name — and never this tab, on either transport.
 *
 * Prefers `BroadcastChannel`, falls back to a `storage`-event channel written through a `StorageBroker`, and
 * degrades to an inert no-op under SSR or when neither exists. Nothing throws: an unavailable API, a
 * non-cloneable payload, blocked storage, and a listener that throws are all absorbed, so a single-tab app and
 * a server render both behave as if the channel simply has no peers.
 *
 * @typeParam TMessage - The payload shape agreed between tabs; a compile-time contract, not a runtime guarantee.
 * @param name - Channel name; peers are every endpoint sharing it on the origin.
 * @param options - Transport selection, storage seam, key prefix, pinned id, and clock.
 * @returns The endpoint: `post`, `subscribe`, `close`, plus its resolved identity and transport.
 */
export function createSyncChannel<TMessage>(name: string, options?: SyncChannelOptions): SyncChannel<TMessage> {
  // v7 rather than v4: it is time-ordered, so a lexicographic compare of two tab ids is a compare of their
  // creation times. The leader election's tie-break rides on exactly that (`LeaderElection.ts`).
  const id = options?.id ?? Guid.createV7();
  const now = options?.now ?? Date.now;
  const broker = options?.broker ?? localStorageStorageBroker;
  const key = `${options?.keyPrefix ?? DefaultKeyPrefix}.${name}`;

  const listeners = new Set<SyncListener<TMessage>>();
  let seq = 0;
  let closed = false;

  // The stamp of the last envelope handed to listeners. The fallback can dispatch the same write twice (a
  // re-entrant handler, a browser that fires for the writer too); `sender:seq` is unique per post, so one slot
  // is enough to suppress a repeat without growing a set that never shrinks.
  let lastStamp: string | null = null;

  /** Applies every receiving rule once, for every transport: shape, self, duplicate, then fan out safely. */
  function deliver(raw: unknown): void {
    if (closed) return;
    if (!isEnvelope(raw)) return;

    // The rule `BroadcastChannel` gives for free and the `storage` fallback does not — normalized here so both
    // transports behave identically, which is what consumers actually depend on.
    if (raw.sender === id) return;

    const stamp = `${raw.sender}:${raw.seq}`;
    if (stamp === lastStamp) return;
    lastStamp = stamp;

    // The payload cannot be validated against `TMessage` at runtime; this cast is the documented seam where a
    // peer's word is taken for it.
    const envelope = raw as SyncEnvelope<TMessage>;

    // A copy, so a listener that unsubscribes (or subscribes) during dispatch cannot mutate the set being walked.
    for (const listener of [...listeners]) {
      try {
        listener(envelope.message, envelope);
      } catch {
        // One bad listener must not strand the others, and must not surface inside a browser event dispatch.
      }
    }
  }

  const binding = bind(options?.transport ?? 'auto', name, key, broker, deliver);

  return {
    name,
    id,
    transport: binding.kind,

    get closed(): boolean {
      return closed;
    },

    post(message: TMessage): void {
      if (closed) return;

      const envelope: SyncEnvelope<TMessage> = { sender: id, seq: seq++, timestamp: now(), message };
      binding.send(envelope);
    },

    subscribe(listener: SyncListener<TMessage>): () => void {
      if (closed) return () => undefined;

      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    close(): void {
      if (closed) return;

      closed = true;
      listeners.clear();
      binding.dispose();
    },
  };
}
