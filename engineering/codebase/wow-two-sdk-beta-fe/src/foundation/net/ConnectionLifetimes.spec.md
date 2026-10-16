# Connection lifecycle contract

- Socket state, open, message and close observers may fail without interrupting transport cleanup or reconnects.
- Event-stream parse and consumer errors reach `onError`; they do not escape the native event callback.
- Poller state-observer errors cannot stop scheduling; work itself remains sequential.
- Native transport and wrapper reconnect ownership remain distinct; an active browser reconnect is not duplicated.
- Explicit close or stop cancels pending scheduling and releases native listeners.

Regression coverage: [runtime units](../../../tests/unit/foundation/browser/RuntimeLifetimes.test.ts).
