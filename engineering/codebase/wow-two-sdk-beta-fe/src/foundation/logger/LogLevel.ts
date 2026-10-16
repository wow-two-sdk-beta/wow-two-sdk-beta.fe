// The severity vocabulary, plus the one comparison the emit path makes. A const object rather than a TS
// `enum`, matching `BackoffStrategy` / `AnalyticsCallKind`: an `enum` emits a runtime object into every
// consumer's bundle and is not erasable under `verbatimModuleSyntax`, while this shape tree-shakes and its
// values are plain strings a sink can print or ship as-is.
//
// `Silent` is a THRESHOLD-ONLY value: it exists so `createLogger({ level: LogLevel.Silent })` drops
// everything, and no record is ever emitted at it. Hence `Number.POSITIVE_INFINITY` for its severity —
// nothing clears it — plus the explicit guard in `isLevelEnabled`, without which the degenerate
// `isLevelEnabled(Silent, Silent)` (`Infinity >= Infinity`) would read as enabled.
//
// Severities are spaced by ten so a consumer can slot a custom level between two of ours without
// renumbering the set.

/**
 * Defines the severity a record is emitted at — ordered `Trace` (finest) through `Error`, with `Silent` as the
 * off switch.
 */
export const LogLevel = {
  /** Refers to the finest-grained diagnostics — per-iteration detail, off in every deployed environment. */
  Trace: 'trace',
  /** Refers to developer-facing detail for diagnosing — request payloads, cache hits, retry decisions. */
  Debug: 'debug',
  /** Refers to the normal-operation narrative — lifecycle milestones worth keeping in production. */
  Info: 'info',
  /** Refers to a recovered or degraded condition — the app continued, but something was off. */
  Warn: 'warn',
  /** Refers to a failure the app could not absorb — the level the `error` payload rides on. */
  Error: 'error',
  /** Refers to the threshold that drops everything. Only ever set as a level; never emitted on a record. */
  Silent: 'silent',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Provides the numeric severity of each level — the ordering {@link isLevelEnabled} compares on. `Silent` is
 * infinite, so nothing clears it.
 */
export const LogLevelSeverity: Readonly<Record<LogLevel, number>> = {
  [LogLevel.Trace]: 10,
  [LogLevel.Debug]: 20,
  [LogLevel.Info]: 30,
  [LogLevel.Warn]: 40,
  [LogLevel.Error]: 50,
  [LogLevel.Silent]: Number.POSITIVE_INFINITY,
};

/**
 * Checks whether a value is one of the known levels — guards the runtime `setLevel` dial and a level read
 * from an env var, where an unrecognized string would otherwise mute the logger in silence.
 *
 * Never throws.
 */
export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && Object.hasOwn(LogLevelSeverity, value);
}

/**
 * Checks whether a record at `level` clears `threshold` — the single comparison guarding the emit path,
 * made before any context merge, redaction, or error serialization is paid for.
 *
 * `Silent` never passes as a `level`, even against a `Silent` threshold.
 *
 * Never throws.
 */
export function isLevelEnabled(level: LogLevel, threshold: LogLevel): boolean {
  if (level === LogLevel.Silent) return false;
  return LogLevelSeverity[level] >= LogLevelSeverity[threshold];
}
