import { describe, expect, it } from 'vitest';
import { createLogger, isLevelEnabled, LogLevel, memoryLogSink, redactContext } from '@src/foundation/logger';

/*
 * Smoke depth, `unit` project (node). Three contracts: the threshold actually drops records
 * below it, a child logger inherits its parent's context, and redaction masks a secret at any
 * depth. The last one is the reason the slice exists rather than a bare `console.log` — a token
 * nested inside a request body must never reach a sink.
 */

describe('level threshold', () => {
  it('drops a record below the threshold and keeps one at or above it', () => {
    const sink = memoryLogSink();
    const logger = createLogger({ level: LogLevel.Warn, sinks: [sink] });

    logger.debug('dropped');
    logger.warn('kept');
    logger.error('also kept');

    expect(sink.records.map((record) => record.message)).toEqual(['kept', 'also kept']);
  });

  it('moves the threshold at runtime', () => {
    const sink = memoryLogSink();
    const logger = createLogger({ level: LogLevel.Error, sinks: [sink] });

    logger.info('dropped');
    logger.setLevel(LogLevel.Info);
    logger.info('kept');

    expect(sink.records).toHaveLength(1);
    expect(isLevelEnabled(LogLevel.Info, logger.getLevel())).toBe(true);
  });
});

describe('child loggers', () => {
  it('merges the parent context, with the child winning on a shared key', () => {
    const sink = memoryLogSink();
    const parent = createLogger({ level: LogLevel.Trace, sinks: [sink], context: { app: 'ui', scope: 'root' } });

    parent.child({ scope: 'checkout' }).info('hello');

    expect(sink.records[0]?.context).toMatchObject({ app: 'ui', scope: 'checkout' });
  });
});

describe('redaction', () => {
  it('masks a sensitive key nested inside the context', () => {
    const redacted = redactContext({ user: 'ada', auth: { password: 'hunter2' } }) as {
      user: string;
      auth: { password: string };
    };

    expect(redacted.user).toBe('ada');
    expect(redacted.auth.password).not.toBe('hunter2');
  });

  it('survives a cyclic context rather than recursing forever', () => {
    const context: Record<string, unknown> = { name: 'x' };
    context.self = context;

    expect(() => redactContext(context)).not.toThrow();
  });
});

describe('sink isolation', () => {
  /* A broken sink is never worth an app crash — the whole reason `onError` exists. */
  it('does not let a throwing sink reach the caller', () => {
    const good = memoryLogSink();
    const failures: unknown[] = [];
    const logger = createLogger({
      level: LogLevel.Trace,
      sinks: [
        {
          name: 'throwing',
          write: () => {
            throw new Error('sink down');
          },
        },
        good,
      ],
      onError: (error) => failures.push(error),
    });

    expect(() => logger.info('still delivered')).not.toThrow();
    expect(good.records).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });
});

it('retains prototype-named data while redacting its nested secrets', () => {
  const output = redactContext(JSON.parse('{"__proto__":{"password":"secret"},"keep":1}'));
  expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
  expect(Object.hasOwn(output, '__proto__')).toBe(true);
  expect(output['__proto__']).toEqual({ password: '[redacted]' });
  expect(output['keep']).toBe(1);
});
