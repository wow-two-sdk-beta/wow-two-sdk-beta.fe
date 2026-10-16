// The wire model every sink sees. Two decisions worth stating:
//
// - **`context` is always present, never optional.** An empty object costs one allocation and removes a
//   branch from every sink and every assertion — the opposite trade from `AnalyticsEvent.properties`,
//   which omits itself because a vendor payload is size-sensitive on the wire. A log record is consumed
//   locally first.
// - **`error` is already serialized when it arrives.** An `Error` stringifies to `{}` (`name` / `message` /
//   `stack` are non-enumerable), so a sink that ships records off the device would silently send empty
//   objects. Shaping it once in the logger — via `serializeError` from `foundation/errors` — means every
//   sink gets a JSON-safe, cycle-free, depth-capped payload without re-solving it.
//
// The whole record is `readonly`: one object is shared across the fan-out, so a sink that mutated it would
// corrupt what the sinks after it see.

import type { SerializedError } from '../errors';
import type { LogLevel } from './LogLevel';

/** Defines the structured fields on a record — the "what was happening" that a message string alone cannot carry. */
export type LogContext = Record<string, unknown>;

/** Defines one emitted log entry — the payload handed to every registered sink. */
export interface LogRecord {
  /** The severity this record was emitted at. Never `LogLevel.Silent`. */
  readonly level: LogLevel;

  /** The message exactly as the caller passed it — never reformatted or interpolated. */
  readonly message: string;

  /** When the record was created (epoch ms), stamped at call time — never at delivery time. */
  readonly timestamp: number;

  /** The merged and redacted fields — logger context first, call-site keys winning. Empty when there were none. */
  readonly context: LogContext;

  /** The serialized failure, when one was logged. Omitted otherwise. */
  readonly error?: SerializedError;
}
