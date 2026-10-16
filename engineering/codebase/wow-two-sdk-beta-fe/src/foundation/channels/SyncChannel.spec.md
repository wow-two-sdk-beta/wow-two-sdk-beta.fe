# Sync channel lifetime contract

- Storage transport delivers each event's captured payload, including bursts before listeners run.
- Malformed envelopes are ignored. Closing an endpoint prevents future delivery or sending.
- Resetting a memory hub closes every endpoint; old handles cannot communicate with replacement peers.
- Broadcast state opens platform channels after mount and closes them on scope disposal.
- Changing a broadcast-state key synchronously resets to the initial value and joins the new channel.
- A peer request receives the current value; unrecognized signal kinds receive no response.

Regression coverage: [runtime units](../../../tests/unit/foundation/browser/RuntimeLifetimes.test.ts) and
[runtime hooks](../../../tests/unit/foundation/browser/RuntimeLifetimes.dom.test.ts).
