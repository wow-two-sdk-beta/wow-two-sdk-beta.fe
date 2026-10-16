import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LosslessJson, JsonLimits, JsonFailureCode } from '@src/foundation/json';
import { ExactNumber, NumberRounding } from '@src/foundation/numbers';
import type { Result } from '@src/foundation/results';

function ok<T, F>(result: Result<T, F>): T {
  if (!result.ok) throw new Error('Unexpected failure: ' + JSON.stringify(result.failure));
  return result.value;
}
const n = (token: string): ExactNumber => ok(ExactNumber.parse(token));

describe('LosslessJson', () => {
  it('preserves every numeric token through nested parse/stringify', () => {
    const source =
      '{"array":[0,-0,123.4500,1E+0009,-9223372036854775808,9223372036854775807,0.1234567890123456789012345678,1e999999999999999999999999],"nested":{"value":2},"text":"123.4500","bool":true,"nil":null}';
    const value = ok(LosslessJson.parse(source)) as Record<string, unknown>;
    expect((value.array as unknown[]).every(ExactNumber.isExactNumber)).toBe(true);
    expect(value.text).toBe('123.4500');
    expect(ok(LosslessJson.stringify(value))).toBe(source);
    expect(Object.getPrototypeOf(value)).toBe(null);
    expect(Object.getPrototypeOf(value.nested)).toBe(null);
  });
  it('consumes actual .NET10 decimal/int64 output without native number conversion', () => {
    const source = readFileSync(new URL('./fixtures/DotNetNumbers.json.txt', import.meta.url), 'utf8').trim();
    const value = ok(LosslessJson.parse(source)) as Record<string, ExactNumber>;
    expect(Object.values(value).every(ExactNumber.isExactNumber)).toBe(true);
    expect(ok(LosslessJson.stringify(value))).toBe(source);
    expect(ok(value.longMin!.toBigInt())).toBe(-9223372036854775808n);
    expect(ok(value.longMax!.toBigInt())).toBe(9223372036854775807n);
    expect(value.decimalMax!.toString()).toBe('79228162514264337593543950335');
    expect(value.decimalMin!.toString()).toBe('-79228162514264337593543950335');
    expect(value.scaled!.toString()).toBe('123.4500');
    const matches = (result: Result<ExactNumber, unknown>, expected: ExactNumber) =>
      expect(ok(ok(result).equals(expected))).toBe(true);
    matches(n('0.1').add(n('0.2')), value.sum!);
    matches(n('9007199254740993').subtract(n('9007199254740992')), value.difference!);
    matches(n('123456789.123456789').multiply(n('0.000000001')), value.product!);
    matches(n('1').divide(n('8'), { decimalPlaces: 3, rounding: NumberRounding.HalfEven }), value.quotient!);
    matches(n('1.005').round({ decimalPlaces: 2, rounding: NumberRounding.HalfEven }), value.halfwayEven!);
  });
  it.each([
    '',
    '{',
    '[1,]',
    '{"a":1,}',
    '{a:1}',
    '+1',
    '.1',
    '01',
    '1.',
    '1e',
    'NaN',
    'undefined',
    '[1 2]',
    '{"a" 1}',
    'true false',
    '"\\uXYZ1"',
    '"\\x20"',
    '"a\nb"',
    '"unterminated',
  ])('rejects malformed JSON %j', (source) => {
    expect(LosslessJson.parse(source)).toMatchObject({ ok: false, failure: { code: JsonFailureCode.InvalidSyntax } });
  });
  it.each([
    '{"x":1,"x":2}',
    '{"x":1,"x":1}',
    '{"x":null,"x":null}',
    '{"x":{"a":1},"x":{"a":1}}',
    '{"x":1,"\\u0078":1}',
    '{"__proto__":1,"__proto__":1}',
  ])('rejects every duplicate key including equal values %s', (source) => {
    expect(LosslessJson.parse(source)).toMatchObject({ ok: false, failure: { code: 'DuplicateKey' } });
  });
  it('preserves prototype and vendor-special names as own data keys', () => {
    const source =
      '{"__proto__":{"polluted":true},"constructor":{"prototype":1},"toString":2,"hasOwnProperty":3,"toJSON":4,"isLosslessNumber":true,"k0":5}';
    const decoded = ok(LosslessJson.parse(source)) as Record<string, unknown>;
    expect(Object.getPrototypeOf(decoded)).toBe(null);
    expect(Object.hasOwn(decoded, '__proto__')).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(ok(LosslessJson.stringify(decoded))).toBe(source);
    expect(ok(LosslessJson.stringify({ isLosslessNumber: true, toString: 'data', toJSON: 'data' }))).toBe(
      '{"isLosslessNumber":true,"toString":"data","toJSON":"data"}',
    );
  });
  it('handles escaping, delimiter-looking strings, Unicode and object-local duplicates', () => {
    const source = String.raw`{"a\"b":["[", "{", "\"", "\\", "\ud800", "123", "2026-09-12"],"one":{"x":1},"two":{"x":2}}`;
    const value = ok(LosslessJson.parse(source));
    const output = ok(LosslessJson.stringify(value));
    expect(JSON.parse(output)).toEqual(JSON.parse(source));
    const trimmed = ok(LosslessJson.parse(' 1 \r\n'));
    expect(ExactNumber.isExactNumber(trimmed)).toBe(true);
    expect(String(trimmed)).toBe('1');
  });
  it('encodes bigint and safe native integers as numeric tokens with explicit decimal values', () => {
    expect(ok(LosslessJson.stringify({ id: 9223372036854775807n, count: 4, zero: -0, amount: n('0.10') }))).toBe(
      '{"id":9223372036854775807,"count":4,"zero":-0,"amount":0.10}',
    );
    for (const value of [
      NaN,
      Infinity,
      -Infinity,
      0.1,
      9007199254740992,
      undefined,
      Symbol('x'),
      () => 1,
      new Date(),
      new Map(),
      /x/,
    ]) {
      expect(LosslessJson.stringify({ value })).toMatchObject({ ok: false, failure: { code: 'UnsupportedValue' } });
    }
  });
  it('rejects cycles, sparse arrays, accessors and unrepresentable properties without invoking hooks', () => {
    const cycle: unknown[] = [];
    cycle.push(cycle);
    expect(LosslessJson.stringify(cycle)).toMatchObject({ ok: false, failure: { code: 'CircularReference' } });
    expect(LosslessJson.stringify(new Array(2))).toMatchObject({ ok: false, failure: { code: 'UnsupportedValue' } });
    const accessor = Object.defineProperty({}, 'x', {
      enumerable: true,
      get() {
        throw new Error('not invoked');
      },
    });
    expect(LosslessJson.stringify(accessor).ok).toBe(false);
    expect(
      LosslessJson.stringify({
        toJSON() {
          throw new Error('not invoked');
        },
      }).ok,
    ).toBe(false);
    expect(LosslessJson.stringify({ [Symbol('x')]: 1 }).ok).toBe(false);
    const extra = Object.assign([1], { custom: 'x' });
    expect(LosslessJson.stringify(extra).ok).toBe(false);
    const shared = { x: n('1') };
    expect(ok(LosslessJson.stringify([shared, shared]))).toBe('[{"x":1},{"x":1}]');
  });
  it('preserves programmer errors from proxies', () => {
    const proxy = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new SyntaxError('programmer bug');
        },
      },
    );
    expect(() => LosslessJson.stringify(proxy)).toThrow('programmer bug');
  });
  it('bounds text, nesting, tokens and huge arrays before allocating or recursive parsing', () => {
    expect(LosslessJson.parse(' '.repeat(JsonLimits.maxCharacters + 1))).toMatchObject({
      ok: false,
      failure: { code: 'ResourceLimit' },
    });
    expect(LosslessJson.parse('['.repeat(JsonLimits.maxDepth + 1) + '0' + ']'.repeat(JsonLimits.maxDepth + 1)).ok).toBe(
      false,
    );
    expect(LosslessJson.parse('[' + '0,'.repeat(JsonLimits.maxTokens) + '0]')).toMatchObject({
      ok: false,
      failure: { code: 'ResourceLimit' },
    });
    expect(LosslessJson.stringify(new Array(2 ** 32 - 1))).toMatchObject({
      ok: false,
      failure: { code: 'ResourceLimit' },
    });
    let deep: unknown = 0;
    for (let i = 0; i <= JsonLimits.maxDepth; i++) deep = [deep];
    expect(LosslessJson.stringify(deep)).toMatchObject({ ok: false, failure: { code: 'ResourceLimit' } });
    expect(LosslessJson.stringify('x'.repeat(JsonLimits.maxCharacters)).ok).toBe(false);
    expect(LosslessJson.stringify('\u0000'.repeat(Math.ceil(JsonLimits.maxCharacters / 6))).ok).toBe(false);
    expect(LosslessJson.stringify({ ['\u0000'.repeat(Math.ceil(JsonLimits.maxCharacters / 6))]: 1 }).ok).toBe(false);
  });
});
