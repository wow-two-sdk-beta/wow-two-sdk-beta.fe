// errors — foundation seam. The generic, transport-agnostic layer for turning an `unknown` caught value
// into something structured: `toError` (total normalization), `getErrorMessage` (UI copy), the `cause`
// chain walkers, the abort / timeout recognizers, and `serializeError` (log + telemetry payload).
// Dependency-free — no Vue, no fetch, no HTTP vocabulary — so any caller can use it.
//
// DEFINING CONTRACT: NOTHING HERE THROWS. Every function is called from inside a `catch` block, where a
// second failure would mask the first and lose the original error entirely. Inputs are assumed hostile:
// a getter that throws, a `Proxy` whose traps throw, a circular `cause`, a structure `JSON.stringify`
// rejects. So every property read is guarded (`readMember`), `instanceof` is guarded (`getPrototypeOf`
// is trappable), and each entry point has a last-resort fallback.
//
// Scope boundary: API errors stay in `foundation/http` — `ApiError` (status + problem body),
// `ProblemDetails`, `fieldErrors`. This slice sits underneath and knows nothing about status codes or
// problem shapes; `http` can adopt these helpers later, never the reverse. An `ApiError` passing through
// `toError` comes back by identity, subclass intact. Note `ResponseEnvelope.toError` in `http` is an
// unrelated operation despite the name: it builds an `ApiError` from an HTTP *response*, whereas
// `toError` here normalizes an already-*caught* value.
//
// Cycles + depth: `cause` chains can self-reference (`error.cause === error`) or run long, so every walk
// tracks links by identity and stops at `DefaultMaxCauseDepth`. Truncation is silent — the cap exists to
// bound work and payload size, not to report on the chain.
export { isErrorLike, type ErrorLike } from './ErrorLike';
export { toError } from './ToError';
export { getErrorMessage, DefaultErrorMessage } from './ErrorMessage';
export { getErrorCause, flattenErrorChain, DefaultMaxCauseDepth } from './ErrorChain';
export { isAbortError, isTimeoutError } from './ErrorRecognizers';
export { serializeError, type SerializedError } from './SerializeError';
