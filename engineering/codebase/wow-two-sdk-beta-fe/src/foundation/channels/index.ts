// sync — foundation seam. The general cross-tab messaging vector: `createSyncChannel` (a typed channel over
// `BroadcastChannel`, with a `storage`-event fallback and an SSR no-op), `createLeaderElection` (exactly one tab
// does the work, with a lease that survives a crash), `memorySyncHub` (the in-process test double), and the
// three Vue bindings `useSyncChannel` / `useLeaderElection` / `useBroadcastState`. No components, no HTTP — a
// "you have unsaved changes in another tab" banner is a consumer of these rules, not their owner.
//
// SCOPE BOUNDARY vs `usePersistentState` (`foundation/storage`) — READ THIS BEFORE ADDING EITHER.
// `usePersistentState` ALREADY SYNCS ACROSS TABS and is not superseded by anything here. The two answer
// different questions:
//
//   - `usePersistentState` asks "is this value still the same?" It persists to `localStorage` and adopts the
//     `storage` event, which reports only THAT a key changed. That is a state MIRROR: durable, one value per
//     key, no vocabulary beyond the value itself. It cannot express "the user just logged out", "flush your
//     draft", "another tab took the socket" — those are not values, and nothing about them belongs in storage.
//   - This slice asks "what just happened?" It carries arbitrary typed messages between tabs with no persistence
//     at all, so an event stays an event: `post({ kind: 'session-expired' })` reaches every tab and leaves
//     nothing behind to be re-read, stale, on the next visit.
//
// So: durable value → `usePersistentState`. Ephemeral event or live-shared state → this slice. The pairing is
// deliberate and neither is a workaround for the other.
//
// COULD `usePersistentState` BE REBUILT ON THIS CHANNEL? Partly, and it should not be rebuilt entirely. Its
// cross-tab half maps cleanly onto a channel and would GAIN from it: `BroadcastChannel` where available (no
// storage write per notification), an explicit `{ key, value }` message instead of the `storage` event's
// "something changed, go re-read it", and the same delivery rules on every browser. But its persistence half is
// the reason it exists — a value must survive the last tab closing, and no channel can do that. The honest
// refactor keeps `StorageBroker` as the source of truth and swaps only the NOTIFICATION path onto a channel;
// the `storage` listener would still be needed as the fallback, since a tab that was closed during the write
// hears no message and must re-read on mount either way. Worth doing when this slice has consumers proving the
// channel out — not urgent, and not a reason to touch a working composable now.
//
// DEFINING CONTRACT: NOTHING HERE THROWS. Every entry point is called from an effect, a click handler, or a
// timer and answers with a value or silence. A missing `BroadcastChannel`, a missing `window`, blocked storage,
// a payload the structured clone algorithm refuses, and a consumer listener that throws are all ordinary
// conditions, absorbed at the boundary. A single-tab app and a server render behave identically: the channel
// simply has no peers, and the sole participant in an election is its leader.
//
// SAME-ORIGIN, SAME-BROWSER, AND NOT A TRUST BOUNDARY. Peers are other copies of this page — not authenticated
// callers. The generic `TMessage` is a compile-time contract: a tab running an older bundle can put anything on
// the wire, so treat an inbound message with the same suspicion as any other input, and never use an election
// as a lock over something that must not happen twice.

export type {
  ResolvedSyncTransport,
  SyncChannel,
  SyncChannelOptions,
  SyncEnvelope,
  SyncListener,
  SyncTransport,
} from './SyncChannel';

export { createSyncChannel } from './CreateSyncChannel';

export { memorySyncHub, type MemorySyncHub } from './MemorySyncHub';

export {
  createLeaderElection,
  type LeaderElection,
  type LeaderElectionOptions,
  type LeaderRole,
  type LeaderSignal,
} from './LeaderElection';

export { useSyncChannel } from './hooks/UseSyncChannel';

export { useLeaderElection, type LeaderElectionState } from './hooks/UseLeaderElection';

export { useBroadcastState, type SetBroadcastState, type BroadcastStateControls } from './hooks/UseBroadcastState';
