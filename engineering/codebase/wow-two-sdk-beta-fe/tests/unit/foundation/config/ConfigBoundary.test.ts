import { describe, expect, expectTypeOf, it } from 'vitest';
import { ConfigError, defineConfig, json, list, str } from '@src/foundation/config';
import { ResultExtensions } from '@src/foundation/results';
import { ExactNumber } from '@src/foundation/numbers';

describe('configuration ownership and decoding', () => {
  it('requires explicit decoding for typed JSON while preserving numeric tokens', () => {
    const schema = {
      raw: json(),
      amount: json((value) => {
        if (!ExactNumber.isExactNumber(value)) return ResultExtensions.fail('expected numeric token');
        return ResultExtensions.ok(value);
      }),
    };
    const config = defineConfig(schema, {
      sources: [{ raw: '{"id":9007199254740993}', amount: '0.10000000000000001' }],
    });
    expectTypeOf(config.raw).toEqualTypeOf<unknown>();
    expectTypeOf(config.amount).toEqualTypeOf<ExactNumber>();
    expect((config.raw as { id: ExactNumber }).id.toString()).toBe('9007199254740993');
    expect(config.amount.toString()).toBe('0.10000000000000001');
    expect(() => defineConfig(schema, { sources: [{ raw: '{}', amount: '"oops"' }] })).toThrow(ConfigError);
  });

  it('creates independent mutable defaults and rejects shared or missing defaults', () => {
    const schema = { items: list({ defaultFactory: () => ['seed'] }) };
    const first = defineConfig(schema, { sources: [] });
    const second = defineConfig(schema, { sources: [] });
    expectTypeOf(first.items).toEqualTypeOf<readonly string[]>();
    expect(first.items).not.toBe(second.items);
    expect(() => list({ default: [] })).toThrow('defaultFactory');
    expect(() => str({ default: undefined })).toThrow();
    expect(() => str({ default: 'x', defaultFactory: () => 'y' })).toThrow();
    const invalidFactory = str({ defaultFactory: () => undefined as unknown as string });
    expect(() => defineConfig({ invalidFactory }, { sources: [] })).toThrow(ConfigError);
  });

  it('does not inherit a default and preserves secret redaction from decoder errors', () => {
    expect(() => defineConfig({ key: str(Object.create({ default: 'inherited' })) }, { sources: [] })).toThrow(
      ConfigError,
    );
    const token = json(
      () => {
        throw 'secret from decoder';
      },
      { secret: true },
    );
    expect(() => defineConfig({ token }, { sources: [{ token: '"secret from decoder"' }] })).toThrow('value redacted');
    try {
      defineConfig({ token }, { sources: [{ token: '"secret from decoder"' }] });
    } catch (error) {
      expect(String(error)).not.toContain('secret from decoder');
    }
  });
});
