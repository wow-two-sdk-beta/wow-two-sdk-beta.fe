// The logger every app talks to. One contract dominates every decision in this file:
//
// DEFINING CONTRACT: NO METHOD HERE THROWS. `logger.error(...)` is called from `catch` blocks, error
// boundaries, and unhandled-rejection handlers — precisely where a second exception masks the first and
// takes down the path that was meant to recover. So the emit body is wrapped end to end, every sink is
// invoked in isolation, and `onError` (itself wrapped) is the only place a failure ever surfaces. A hostile
// context, a `Proxy` that throws from every trap, a sink that always throws, a clock that throws: all
// degrade to a dropped or partial record, never to a raised exception.
//
// Decisions worth stating:
//
// - **The threshold is checked FIRST, before any work.** Merging context, walking it for redaction and
//   serializing an error all cost more than a suppressed line is worth. Only the caller's own arguments are
//   evaluated (`logger.debug('x', expensive())` still pays for `expensive()` — that is JS, not us); nothing
//   this module controls is spent below the threshold, and no sink is touched.
// - **`child()` forks the CONTEXT, and only the context.** Sinks, redaction config, `onError` and the clock
//   are shared with the root — and so is the LEVEL, held in one mutable cell for the whole tree. That makes
//   `setLevel` a single runtime dial ("turn debug on") instead of something to re-apply across every child
//   an app has spawned. A child cannot diverge from its parent's level; that is the design, not a gap.
// - **Context merges parent-first, so the more specific writer wins:** root < child < grandchild < call
//   site. A child re-binding `requestId` overrides its parent's, which is how a reader expects the nearest
//   scope to describe the record.
// - **`error()`'s second argument is the ERROR unless it is a plain object that is not error-like.** This
//   mirrors how TypeScript picks the overload — an `Error` instance is not assignable to `LogContext`
//   (no index signature), so `error(msg, err)` resolves to the error signature and `error(msg, { userId })`
//   to the context one. The one addition is that a PLAIN object which is error-like (`{ message: '…' }`) is
//   also taken as the error, because `catch (e) { log.error('failed', e) }` — where a library threw a
//   non-`Error` — is the whole reason the overload exists, and `e` is typed `unknown` there. The cost: a
//   context whose fields include `message` reads as an error. Disambiguate with `error(msg, undefined, ctx)`.
// - **One record object is shared across the fan-out.** Building a copy per sink would be pure waste;
//   `LogRecord` is fully `readonly` so a sink is expected to treat it as immutable.

import { isErrorLike, serializeError } from '../errors';
import { isLevelEnabled, isLogLevel, LogLevel } from './LogLevel';
import type { LogContext, LogRecord } from './LogRecord';
import type { LogErrorHandler, LogSink } from './LogSink';
import { DefaultRedactionMask, DefaultRedactKeys, isPlainObject, redactContext } from './Redaction';

/** Provides the level a logger starts at when the options name none — production-safe, so `debug` is opt-in. */
export const DefaultLogLevel: LogLevel = LogLevel.Info;

/** Defines the options for {@link createLogger}. */
export interface LoggerOptions {
  /** The starting threshold — records below it are dropped. Default {@link DefaultLogLevel}. */
  readonly level?: LogLevel;

  /** The sinks records fan out to. Copied on construction; empty means every call is a no-op. */
  readonly sinks?: ReadonlyArray<LogSink>;

  /** The base structured fields merged into every record — service name, release, session id. */
  readonly context?: LogContext;

  /** The context keys whose values are masked, at any depth, case-insensitively. Default {@link DefaultRedactKeys}. */
  readonly redactKeys?: ReadonlyArray<string>;

  /** The placeholder written over a redacted value. Default {@link DefaultRedactionMask}. */
  readonly redactionMask?: string;

  /** Receives every sink failure. Omitted → failures are swallowed; a broken sink is never worth an app crash. */
  readonly onError?: LogErrorHandler;

  /** Supplies the record timestamp (epoch ms) — injectable for deterministic tests. Default `Date.now`. */
  readonly now?: () => number;
}

/** Defines the logger — five level methods, a context fork, and a runtime level dial. No method throws. */
export interface Logger {
  /** Emits at `trace` — the finest detail, suppressed unless the threshold is lowered to it. */
  trace(message: string, context?: LogContext): void;

  /** Emits at `debug` — developer-facing detail while diagnosing. */
  debug(message: string, context?: LogContext): void;

  /** Emits at `info` — the normal-operation narrative. */
  info(message: string, context?: LogContext): void;

  /** Emits at `warn` — a recovered or degraded condition. */
  warn(message: string, context?: LogContext): void;

  /** Emits at `error` with structured context only. */
  error(message: string, context?: LogContext): void;

  /**
   * Emits at `error` with a caught value, serialized onto the record's `error`. Pass `undefined` to log context
   * under a `message` key.
   */
  error(message: string, error: unknown, context?: LogContext): void;

  /**
   * Creates a logger whose records carry this one's context merged with `context` — the child's keys win.
   * Sinks, level, and config are shared.
   */
  child(context: LogContext): Logger;

  /**
   * Moves the threshold for the WHOLE logger tree at runtime — an unknown value is ignored rather than silently
   * muting output.
   */
  setLevel(level: LogLevel): void;

  /** Reads the current threshold. */
  getLevel(): LogLevel;

  /** Checks whether a level would currently be emitted — guard an expensive context build with this. */
  isEnabled(level: LogLevel): boolean;
}

/** Holds everything a logger tree shares — every field but `level` is fixed at construction. */
interface LoggerCore {
  /** The sinks every record in the tree fans out to. */
  readonly sinks: ReadonlyArray<LogSink>;

  /** The keys redacted from every context in the tree. */
  readonly redactKeys: ReadonlyArray<string>;

  /** The mask written over a redacted value. */
  readonly mask: string;

  /** The sink-failure handler, when the app supplied one. */
  readonly onError: LogErrorHandler | undefined;

  /** The clock every record is stamped from. */
  readonly now: () => number;

  /** The threshold — the one mutable cell, shared by the root and every child. */
  level: LogLevel;
}

/** Copies a context object without trusting it — a throwing getter must not turn construction into a failure. */
function copyContext(context: LogContext | undefined): LogContext {
  if (context === undefined) return {};
  try {
    return { ...context };
  } catch {
    return {};
  }
}

/** Builds a logger node over a shared core and an already-safe context — the root and every child go through it. */
function createLoggerFrom(core: LoggerCore, context: LogContext): Logger {
  /** Routes a sink failure to `onError` — a throwing handler is swallowed, since nowhere is left to report. */
  const report = (error: unknown, sink: LogSink, record: LogRecord): void => {
    if (!core.onError) return;
    try {
      core.onError(error, { sink, record });
    } catch {
      // The handler is the last line of defence; a throw here must not reach the caller either.
    }
  };

  /**
   * Builds one record and fans it out. `failure` is BOXED so that "no error was logged" stays distinct from
   * "the logged error was `undefined`" — `error(msg, undefined, ctx)` means the former.
   */
  const emit = (
    level: LogLevel,
    message: string,
    callContext?: LogContext,
    failure?: { readonly value: unknown },
  ): void => {
    try {
      if (!isLevelEnabled(level, core.level)) return;

      let merged: LogContext = context;
      if (callContext !== undefined) {
        try {
          merged = { ...context, ...callContext };
        } catch {
          // A hostile call-site context (a throwing getter, an `ownKeys` trap) costs its own fields, never
          // the line — the message and the error still reach the sinks under the logger's own context.
          merged = context;
        }
      }

      const record: LogRecord = {
        level,
        message,
        timestamp: core.now(),
        context: redactContext(merged, core.redactKeys, core.mask),
        ...(failure ? { error: serializeError(failure.value) } : {}),
      };

      for (const sink of core.sinks) {
        try {
          sink.write(record);
        } catch (sinkFailure) {
          report(sinkFailure, sink, record);
        }
      }
    } catch {
      // A failure in the emit path itself (a hostile context spread, a clock that throws) has no record to
      // report against and no sink proven able to receive it — the contract says drop it, never raise it.
    }
  };

  return {
    trace: (message: string, callContext?: LogContext): void => emit(LogLevel.Trace, message, callContext),

    debug: (message: string, callContext?: LogContext): void => emit(LogLevel.Debug, message, callContext),

    info: (message: string, callContext?: LogContext): void => emit(LogLevel.Info, message, callContext),

    warn: (message: string, callContext?: LogContext): void => emit(LogLevel.Warn, message, callContext),

    error: (message: string, second?: unknown, third?: LogContext): void => {
      // Nothing in the second slot: whatever is in the third is the context (the explicit disambiguator).
      if (second === undefined) {
        emit(LogLevel.Error, message, third);
        return;
      }
      // A plain, non-error-like object is structured context — everything else is the caught value.
      if (isPlainObject(second) && !isErrorLike(second)) {
        emit(LogLevel.Error, message, second);
        return;
      }
      emit(LogLevel.Error, message, third, { value: second });
    },

    child: (childContext: LogContext): Logger => createLoggerFrom(core, { ...context, ...copyContext(childContext) }),

    setLevel: (level: LogLevel): void => {
      if (isLogLevel(level)) core.level = level;
    },

    getLevel: (): LogLevel => core.level,

    isEnabled: (level: LogLevel): boolean => isLevelEnabled(level, core.level),
  };
}

/**
 * Creates a {@link Logger} — one per app (or per bounded context), shared by every caller under it.
 *
 * Nothing is wired by default: with no `sinks`, every call is a no-op, so an SDK consumer opts into output
 * explicitly rather than inheriting console noise. Fan out to `consoleLogSink()` in development and add a
 * shipping sink in production; `memoryLogSink()` is the test double.
 *
 * Never throws, and neither does any method on the returned logger.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const core: LoggerCore = {
    sinks: [...(options.sinks ?? [])],
    redactKeys: [...(options.redactKeys ?? DefaultRedactKeys)],
    mask: options.redactionMask ?? DefaultRedactionMask,
    onError: options.onError,
    now: options.now ?? Date.now,
    level: isLogLevel(options.level) ? options.level : DefaultLogLevel,
  };

  return createLoggerFrom(core, copyContext(options.context));
}
