// The in-process channel double — `memoryStorageBroker`'s parallel for this slice, and for the same reason: a
// consumer testing cross-tab behaviour needs two endpoints that can talk without a browser, a second tab, or a
// real transport.
//
// WHY IT EXISTS RATHER THAN "just use the real thing in tests": Node has `BroadcastChannel`, but it delivers
// through the event loop. Under `vi.useFakeTimers` the loop is no longer the test's to drive, so a leader
// election — whose entire logic is timers reacting to messages — becomes a race between faked timers and real
// async delivery. This hub delivers SYNCHRONOUSLY, inside `post`, which collapses that race: post, and every
// peer has already reacted before the next line runs. That makes heartbeat, expiry, and hand-over assertions
// deterministic instead of flaky.
//
// It keeps every rule the real transports keep — sender exclusion, safe fan-out, closed endpoints going quiet —
// because a double that is more forgiving than production is a double that hides bugs.
//
// WHAT IT DELIBERATELY DOES NOT MODEL: structured-clone or JSON round-tripping. Payloads are passed by
// reference, so a test can pass a `Map` the `storage` fallback would have destroyed, and a mutation after
// `post` is visible to the receiver. Serialization limits belong to the transports; assert those against the
// transport that has them.

import { Guid } from '../identifiers';

import type { SyncChannel, SyncEnvelope, SyncListener } from './SyncChannel';

/** One endpoint's private state inside a hub, kept as the erased shape the hub can store uniformly. */
interface HubEndpoint {
  /** Identifies the endpoint, mirroring the channel's own id. */
  readonly id: Guid;

  /** Names the channel this endpoint is joined to; delivery is scoped to a matching name. */
  readonly name: string;

  /** Hands one envelope to this endpoint's listeners. */
  receive(envelope: SyncEnvelope<unknown>): void;

  /** Reports whether the endpoint has closed and should be skipped. */
  isClosed(): boolean;

  close(): void;
}

/** Represents an isolated in-process message bus standing in for one origin's set of browser tabs. */
export interface MemorySyncHub {
  /**
   * Opens a new endpoint on `name` — the test's equivalent of opening another tab. Two calls with the same
   * name yield two peers that can talk to each other but not to themselves.
   *
   * @typeParam TMessage - The payload shape shared by the endpoints on this channel.
   * @param name - Channel name; only endpoints sharing it exchange messages.
   * @param id - Pins the endpoint's id, for deterministic leader tie-breaks; minted as a v7 GUID when omitted.
   * @returns A `SyncChannel` backed by this hub.
   */
  channel<TMessage>(name: string, id?: Guid): SyncChannel<TMessage>;

  /** Counts the endpoints that are still open, across every channel name — the leak check after a teardown. */
  readonly openCount: number;

  /** Closes every endpoint and empties the hub, so one test cannot leak peers into the next. */
  reset(): void;
}

/**
 * Builds an isolated in-memory hub whose channels deliver synchronously and never touch a browser API.
 *
 * Use it to test cross-tab logic — including this slice's own leader election — under `vi.useFakeTimers`, where
 * the real `BroadcastChannel`'s event-loop delivery would otherwise race the faked clock. Each hub is a closed
 * world: two hubs never see each other's traffic.
 *
 * @returns A hub that mints `SyncChannel` endpoints and can be reset between tests.
 */
export function memorySyncHub(): MemorySyncHub {
  const endpoints = new Set<HubEndpoint>();

  return {
    channel<TMessage>(name: string, id?: Guid): SyncChannel<TMessage> {
      const endpointId = id ?? Guid.createV7();
      const listeners = new Set<SyncListener<TMessage>>();
      let seq = 0;
      let closed = false;

      /** Fans an envelope out to this endpoint's listeners, isolating a throwing one exactly as production does. */
      function receive(envelope: SyncEnvelope<unknown>): void {
        if (closed) return;

        const typed = envelope as SyncEnvelope<TMessage>;
        for (const listener of [...listeners]) {
          try {
            listener(typed.message, typed);
          } catch {
            // Matches `createSyncChannel`: one listener's failure never strands the rest.
          }
        }
      }

      const endpoint: HubEndpoint = {
        id: endpointId,
        name,
        receive,
        isClosed: () => closed,
        close: () => {
          if (closed) return;
          closed = true;
          listeners.clear();
          endpoints.delete(endpoint);
        },
      };
      endpoints.add(endpoint);

      return {
        name,
        id: endpointId,
        transport: 'broadcast',

        get closed(): boolean {
          return closed;
        },

        post(message: TMessage): void {
          if (closed) return;

          const envelope: SyncEnvelope<TMessage> = {
            sender: endpointId,
            seq: seq++,
            timestamp: Date.now(),
            message,
          };

          // Snapshot first: a listener may open or close an endpoint while reacting, and the live set must not
          // be mutated mid-walk. The `!== endpoint` test is the sender-exclusion rule, enforced here rather
          // than left to the receiver so the double cannot be laxer than production.
          for (const peer of [...endpoints]) {
            if (peer === endpoint) continue;
            if (peer.name !== name) continue;
            if (peer.isClosed()) continue;
            peer.receive(envelope);
          }
        },

        subscribe(listener: SyncListener<TMessage>): () => void {
          if (closed) return () => undefined;

          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },

        close: endpoint.close,
      };
    },

    get openCount(): number {
      let open = 0;
      for (const endpoint of endpoints) if (!endpoint.isClosed()) open += 1;
      return open;
    },

    reset(): void {
      for (const endpoint of [...endpoints]) endpoint.close();
    },
  };
}
