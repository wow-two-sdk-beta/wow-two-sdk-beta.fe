// logger — foundation seam. A structured logger: `createLogger({ sinks, level })` returns level methods
// that build a `LogRecord` (level · message · timestamp · context · serialized error) and fan it out to
// every `LogSink`. Dependency-free apart from `foundation/errors` — no Vue, no fetch, no transport — so
// any caller can use it, including the ones inside `catch`.
//
// DEFINING CONTRACT: NOTHING HERE THROWS. A logger is called from error paths, so a failure raised out of
// one masks the original error and takes down the recovery. Sinks are third-party code and are invoked in
// isolation (failures routed to `onError`); contexts are assumed hostile (throwing getters, `Proxy` traps,
// self-reference, pathological depth) and degrade to markers rather than exceptions.
//
// What earns this over `console.log`:
//
// - **`child(context)`** — the reason to have a logger at all. A request handler binds `requestId` once and
//   every line under it carries the field; children nest and compose, the nearer scope winning on a key
//   conflict. Without it, correlation ids are re-threaded through every call site by hand.
// - **Redaction on the way in** — `password` / `token` / `secret` / `authorization` / `apiKey` are masked at
//   any depth, case-insensitively, BEFORE a sink sees them. Redacting inside each sink is the same rule
//   written N times, with N chances to forget it.
// - **A level threshold checked before any formatting cost** — suppressed lines cost one integer compare,
//   so `logger.debug` may be left in hot paths.
// - **Errors serialized once** — through `serializeError` from `foundation/errors`, because an `Error` goes
//   through `JSON.stringify` as `{}` and every shipping sink would otherwise re-solve that.
//
// Scope boundary: this slice records what happened locally; `/analytics` (product events, consent-gated,
// vendor-bound) and `/feedback` (user-visible notices) are separate seams and neither is a sink here.
// Nothing auto-registers — with no `sinks` a logger is a no-op, so an SDK consumer opts into output
// explicitly rather than inheriting console noise (GWDNBM).

// Severity vocabulary — the level set, its ordering, and the threshold comparison
export { LogLevel, LogLevelSeverity, isLogLevel, isLevelEnabled } from './LogLevel';

// Record contract — the wire model every sink sees
export type { LogContext, LogRecord } from './LogRecord';

// Sink seam — the destination interface plus its failure vocabulary
export type { LogSink, LogSinkErrorContext, LogErrorHandler } from './LogSink';

// Logger — factory, defaults, and the instance contract
export { createLogger, DefaultLogLevel, type Logger, type LoggerOptions } from './Logger';

// Redaction — the context scrubber, reusable on its own for anything shipped off the device
export {
  redactContext,
  DefaultRedactKeys,
  DefaultRedactionMask,
  DefaultMaxRedactDepth,
  CircularMarker,
  UnreadableMarker,
  TruncatedMarker,
} from './Redaction';

// URL redaction — credentials in user-info, query and fragment, for any URL shipped off the device
export { redactUrl, DefaultRedactUrlParams } from './UrlRedaction';

// Built-in sinks — dev console + test double
export { consoleLogSink, type ConsoleLogSinkOptions } from './ConsoleLogSink';
export { memoryLogSink, type MemoryLogSink } from './MemoryLogSink';
