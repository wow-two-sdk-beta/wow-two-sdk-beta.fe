import { describe, expect, it } from 'vitest';
import {
  array,
  assertValid,
  email,
  formatIssuePath,
  number,
  object,
  string,
  ValidationError,
  ValidationCodes,
} from '@src/foundation/validators';

/*
 * Smoke depth, `unit` project (node). Two contracts carry this slice, and both are asserted
 * here rather than the rule set itself:
 *
 *  1. Every rule reports a STABLE CODE from the shared vocabulary — that code is the seam the
 *     backend's message catalogue matches on, so a rule that stops emitting one silently
 *     breaks cross-stack message parity while still rejecting the value.
 *  2. Nothing here throws except `assertValid`, which throws only because the caller asked.
 */

describe('rule codes', () => {
  it('reports the documented code for a failed refinement', () => {
    const result = string().min(2).validate('a');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.issues[0]?.code).toBe('min');
  });

  it('reports `type` when the value is the wrong kind entirely', () => {
    const result = string().validate(42);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.issues[0]?.code).toBe('type');
  });

  it('reports `email` for the format rule', () => {
    const result = email().validate('not-an-email');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.issues[0]?.code).toBe('email');
  });

  it('every emitted code belongs to the shared vocabulary', () => {
    const result = object({ name: string().min(2), age: number() }).validate({ name: 'a', age: 'x' });
    expect(result.ok).toBe(false);
    if (result.ok) return;

    const codes = result.failure.issues.map((issue) => issue.code);
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) {
      expect(ValidationCodes).toContain(code);
    }
  });
});

describe('issue paths', () => {
  it('addresses a nested failure at the exact spot it failed', () => {
    const result = object({ tags: array(string()) }).validate({ tags: ['ok', 7] });
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.failure.issues[0]?.path).toEqual(['tags', 1]);
    expect(formatIssuePath(result.failure.issues[0]?.path ?? [])).toContain('tags');
  });
});

describe('the no-throw contract', () => {
  it('returns a result rather than throwing, whatever it is handed', () => {
    for (const value of [undefined, null, NaN, Symbol('x'), () => undefined, { a: 1 }]) {
      expect(() => string().validate(value)).not.toThrow();
    }
  });

  it('assertValid is the one exception, and it throws a ValidationError', () => {
    expect(() => assertValid(string(), 'fine')).not.toThrow();
    expect(() => assertValid(string(), 42)).toThrow(ValidationError);
  });
});

it('preserves programmer exceptions in custom checks and transforms', () => {
  expect(() =>
    string()
      .refine(() => {
        throw new Error('check bug');
      }, 'bad')
      .validate('a'),
  ).toThrow('check bug');
  expect(() =>
    string()
      .transform(() => {
        throw new Error('mapper bug');
      })
      .validate('a'),
  ).toThrow('mapper bug');
});
it('keeps the Standard Schema adapter protocol while house validation uses Result', () => {
  const schema = string().transform((value) => value.length);
  expect(schema.validate('abc')).toEqual({ ok: true, value: 3 });
  expect(schema['~standard'].validate('abc')).toEqual({ value: 3 });
  expect(schema['~standard'].validate(3)).toHaveProperty('issues');
});
