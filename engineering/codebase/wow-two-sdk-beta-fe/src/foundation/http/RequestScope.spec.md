# Request scope and HTTP lifetime

Source: [RequestScope.ts](RequestScope.ts), [CreateApiClient.ts](CreateApiClient.ts).

## Ownership

`createRequestScope()` creates an isolated lifetime; no app or SSR request shares a scope implicitly.
`capture()` records one revision and cancellation signal. `invalidate()` aborts that revision and opens another;
`dispose()` permanently aborts work and releases listeners. An old snapshot cannot become current again.
Listeners are all attempted even when one throws, followed by an aggregate failure.

Pass `scope` to `createApiClient` when calls belong to an auth, tenant or other replaceable session.
The client captures before body serialization or asynchronous token resolution, resolves credentials once,
and retains that origin across retries and response reading. Caller cancellation combines with scope cancellation.
Token resolvers, fetch delegates and body readers that ignore cancellation cannot leave callers waiting forever.
Late settlements are observed but cannot invoke `onUnauthorized` or return obsolete data.

Anonymous clients remain supported without a scope. Application delegate/codec/decoder bugs still throw.
Optional error diagnostics cannot erase HTTP classification: malformed HTML/JSON for a 503 remains retryable HTTP.
Malformed successful JSON remains a protocol failure.

## Detailed responses

Ordinary methods keep `Result<T, ApiFailure>`. `client.detailed` exposes the same methods and request overloads,
returning `Result<ApiResponseValue<T>, ApiFailure>` with `value`, `status`, immutable lower-case `headers`, and `url`.
Text, Blob, ArrayBuffer and explicit empty responses retain their inferred types; typed JSON still requires a decoder.
Headers are available only when the browser exposes them (including CORS response-header rules).

## Verification

[RequestLifetime.test.ts](../../../tests/unit/foundation/http/RequestLifetime.test.ts) covers cancellation,
late unauthorized responses, retry diagnostics, metadata and positive/negative overload inference.
