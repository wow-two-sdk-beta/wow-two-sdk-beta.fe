// The dev sink — the one an app wires up first and the one it keeps in development.
//
// Deliberately NOT registered by default: an SDK that writes to the console unasked is noise (GWDNBM), so
// `createLogger({ sinks: [consoleLogSink()] })` is an explicit opt-in.
//
// `console` is read inside `write` rather than captured at factory time, so a test that stubs
// `console.warn` after construction still sees the stub, and importing this file asserts nothing about the
// environment. Each level routes to its own method because devtools filters on exactly that — collapsing
// everything onto `console.log` throws away the level filter the browser already gives you for free. Note
// `console.trace` prints a stack alongside the message; that is what makes it the trace method, and why
// `Trace` is off by default.
//
// Context and error are passed as separate arguments rather than interpolated into the message, so devtools
// renders them as inspectable objects instead of `[object Object]`.

import { LogLevel } from './LogLevel';
import type { LogRecord } from './LogRecord';
import type { LogSink } from './LogSink';

/** Defines the options for {@link consoleLogSink}. */
export interface ConsoleLogSinkOptions {
  /** The tag prefixed to every message. Default `'[log]'`; pass `''` for no prefix. */
  readonly prefix?: string;
}

/**
 * Resolves the console method a level routes to. `Silent` never reaches a sink; it returns `undefined` to keep
 * the switch exhaustive.
 */
function resolveMethod(level: LogLevel): ((...args: unknown[]) => void) | undefined {
  switch (level) {
    case LogLevel.Trace:
      return console.trace;
    case LogLevel.Debug:
      return console.debug;
    case LogLevel.Info:
      return console.info;
    case LogLevel.Warn:
      return console.warn;
    case LogLevel.Error:
      return console.error;
    case LogLevel.Silent:
      return undefined;
  }
}

/**
 * Creates a sink that writes each record to the matching `console` method — the development destination, opt-in
 * like every other wire.
 */
export function consoleLogSink(options: ConsoleLogSinkOptions = {}): LogSink {
  const prefix = options.prefix ?? '[log]';

  return {
    name: 'console',
    write: (record: LogRecord): void => {
      const method = resolveMethod(record.level) ?? console.log;
      const args: unknown[] = [];
      if (Object.keys(record.context).length > 0) args.push(record.context);
      if (record.error !== undefined) args.push(record.error);

      method.call(console, prefix === '' ? record.message : `${prefix} ${record.message}`, ...args);
    },
  };
}
