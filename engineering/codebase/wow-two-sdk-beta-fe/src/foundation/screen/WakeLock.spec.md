# Wake lock lifetime contract

- A hold requests a screen lock only while its document is visible.
- Hiding the document releases a held lock; returning to visibility attempts reacquisition.
- A request completed after hiding or disposal is immediately released.
- A platform `release` event clears the held state.
- Disposing a hold removes visibility and release listeners and stops reacquisition.
- `WakeLockHandle.subscribeRelease` returns its own listener disposer.

Regression coverage: [runtime units](../../../tests/unit/foundation/browser/RuntimeLifetimes.test.ts).
