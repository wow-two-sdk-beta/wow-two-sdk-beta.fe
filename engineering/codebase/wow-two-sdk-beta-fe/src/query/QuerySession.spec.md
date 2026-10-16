# Query session lifetime

Source: [CreateQueryClient.ts](adapters/tanstack/CreateQueryClient.ts),
[QueryLifetime.ts](adapters/tanstack/QueryLifetime.ts), [Persistence.ts](adapters/tanstack/Persistence.ts).

`createQueryClient({ scope: bridge.scope })` explicitly binds private server state to the app identity.
Without auth, `client.invalidateSession()` creates an equivalent boundary. `client.dispose()` permanently
cancels the client lifetime, clears caches and removes the external subscription; it does not dispose the
external auth scope. The app owns client disposal. Ordinary component unmounts may leave background mutations
running; disposing the app/session prevents their later effects. Vendor `client.clear()` remains a cache-only
primitive and does not create a session boundary.

Mutations capture their origin at invocation, before scheduling or optimistic queuing. Session invalidation
cancels their outward Result, blocks `onConfirmed`, skips queued obsolete writes and prevents rollback into a
new identity's cache. Mutation functions receive `{ signal }`; forwarding it cancels transport too.
Live query observers rebind to the cleared cache; paginated placeholders cannot retain another identity's page.

Persistence belongs to the identity at `setupQueryPersistence` time. Invalidation removes that writer's saved
snapshot, cancels scheduled writes and unsubscribes. Set persistence up again for a new identity with an explicit
key allowlist; this avoids silently opting another user's data into the prior persistence policy.
`handle.clear()` removes its own snapshot; an old handle cannot erase a newer writer using the same storage key.
`unsubscribe()` only stops writes and preserves saved data. JSON-safe allowlisted data only; secrets stay excluded.

[SessionBoundary.dom.test.ts](../../tests/unit/query/SessionBoundary.dom.test.ts) covers passive confirmations,
optimistic rollback/queues, live observers, persistence and client disposal.
