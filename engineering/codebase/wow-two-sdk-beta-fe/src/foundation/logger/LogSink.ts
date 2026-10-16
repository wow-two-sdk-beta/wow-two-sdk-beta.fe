// The sink seam — one method between the logger and wherever records actually go (console, an HTTP
// shipper, Sentry, a test double).
//
// `write` is synchronous and returns nothing, unlike `AnalyticsProvider`'s promise-tolerant methods. A
// logger is called from `catch` blocks and unhandled-rejection handlers where there is nobody left to await
// a result, so a batching sink owns its own queue and flush schedule rather than handing the logger a
// promise it would have to drop on the floor anyway.
//
// A sink MAY throw — it is third-party code on a non-critical path. The logger wraps every call and routes
// the failure to `onError`, so one broken sink never stops the others in the fan-out and never reaches the
// caller.

import type { LogRecord } from './LogRecord';

/** Defines a destination the logger fans records out to — implement `write` and nothing else. */
export interface LogSink {
  /** The name used in `onError` reporting — the only way a handler can tell which sink failed. */
  readonly name?: string;

  /** Receives one record, already filtered by level and redacted. Treat it as read-only; shared across the fan-out. */
  write(record: LogRecord): void;
}

/** Defines the context handed to `onError` when a sink's `write` throws. */
export interface LogSinkErrorContext {
  /** The sink that threw. */
  readonly sink: LogSink;

  /** The record being written when it threw. */
  readonly record: LogRecord;
}

/**
 * Defines the sink-failure handler — logging must never break the caller, so every sink throw lands here
 * instead of propagating.
 */
export type LogErrorHandler = (error: unknown, context: LogSinkErrorContext) => void;
