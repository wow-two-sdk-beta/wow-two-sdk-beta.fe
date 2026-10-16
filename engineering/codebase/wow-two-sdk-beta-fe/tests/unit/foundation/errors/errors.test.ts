import { describe, expect, it } from 'vitest';
import {
  DefaultErrorMessage,
  flattenErrorChain,
  getErrorCause,
  getErrorMessage,
  isAbortError,
  isErrorLike,
  serializeError,
  toError,
} from '@src/foundation/errors';

/*
 * Smoke depth, `unit` project (node). The slice's premise is TOTALITY: a `catch` block receives
 * `unknown`, and every helper here has to answer for a string, a number, `null`, a plain object,
 * and a real `Error` without adding a second throw on top of the first. That is what the
 * assertions cover — the shapes, not the formatting.
 */

const THROWN: readonly unknown[] = ['a string', 42, null, undefined, { code: 'X' }, new Error('real')];

describe('totality', () => {
  it('never throws, whatever it is handed', () => {
    for (const value of THROWN) {
      expect(() => toError(value), `toError(${String(value)})`).not.toThrow();
      expect(() => getErrorMessage(value)).not.toThrow();
      expect(() => serializeError(value)).not.toThrow();
      expect(() => isErrorLike(value)).not.toThrow();
    }
  });
});

describe('toError', () => {
  it('passes a real Error through by identity', () => {
    const original = new Error('real');
    expect(toError(original)).toBe(original);
  });

  it('wraps a non-Error into one', () => {
    expect(toError('boom')).toBeInstanceOf(Error);
    expect(toError('boom').message).toBe('boom');
  });
});

describe('getErrorMessage', () => {
  it('reads a real message, and falls back for a value with none', () => {
    expect(getErrorMessage(new Error('specific'))).toBe('specific');
    expect(getErrorMessage(null)).toBe(DefaultErrorMessage);
    expect(getErrorMessage(null, 'custom fallback')).toBe('custom fallback');
  });
});

describe('cause chains', () => {
  it('walks a wrapped error down to its root', () => {
    const root = new Error('root');
    const wrapped = new Error('wrapped', { cause: root });

    expect(getErrorCause(wrapped)).toBe(root);
    expect(flattenErrorChain(wrapped)).toHaveLength(2);
  });

  it('terminates on a self-referential cause rather than recursing forever', () => {
    const cyclic = new Error('cyclic');
    (cyclic as { cause?: unknown }).cause = cyclic;

    expect(() => flattenErrorChain(cyclic)).not.toThrow();
  });
});

describe('recognizers', () => {
  it('names an abort by its DOMException name, not by message text', () => {
    const aborted = new Error('The operation was aborted');
    aborted.name = 'AbortError';

    expect(isAbortError(aborted)).toBe(true);
    expect(isAbortError(new Error('unrelated'))).toBe(false);
  });
});

describe('serializeError', () => {
  it('produces a JSON-safe record carrying the message', () => {
    const serialized = serializeError(new Error('boom'));

    expect(serialized.message).toBe('boom');
    expect(() => JSON.stringify(serialized)).not.toThrow();
  });
});
