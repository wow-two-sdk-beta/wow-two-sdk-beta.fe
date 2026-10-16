import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { fieldIssues } from '@src/foundation/http/FieldErrors';
import { LosslessJson } from '@src/foundation/json';
import { ExactNumber } from '@src/foundation/numbers';
import {
  array,
  boolean,
  createMessageResolver,
  exactNumber,
  object,
  string,
  type Infer,
  type InferInput,
} from '@src/foundation/validators';

describe('validation boundary ownership', () => {
  it('distinguishes absent optional fields from inherited prototype members', () => {
    const result = object({ toString: string().optional(), constructor: string().optional() }).validate({});
    expect(result).toEqual({ ok: true, value: {} });
    expect(object({ admin: boolean() }).validate(Object.create({ admin: true })).ok).toBe(false);
  });

  it('preserves explicit prototype-named data properties', () => {
    const shape = Object.create(null);
    shape.__proto__ = string();
    const result = object(shape).validate(JSON.parse('{"__proto__":"value"}'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.hasOwn(result.value, '__proto__')).toBe(true);
      expect(result.value.__proto__).toBe('value');
      expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
    }
  });

  it.each(['constructor', 'toString', '__proto__'])('preserves unknown code %s and its fallback', (code) => {
    const issue = fieldIssues({ problem: { errors: [{ property: 'field', message: 'fallback', code }] } }).field![0]!;
    expect(issue.code).toBe(code);
    expect(createMessageResolver()(issue, 'field')).toBe('fallback');
  });

  it('keeps prototype-named parameter keys as own data', () => {
    const problem = JSON.parse(
      '{"errors":[{"property":"field","message":"fallback","params":{"__proto__":{"min":2},"constructor":3,"toString":4}}]}',
    );
    const params = fieldIssues({ problem }).field![0]!.params!;
    expect(Object.getPrototypeOf(params)).toBe(null);
    expect(Object.keys(params)).toEqual(['__proto__', 'constructor', 'toString']);
  });

  it('ignores inherited labels and rejects malformed caller renderer outputs', () => {
    const resolve = createMessageResolver(undefined, {});
    expect(resolve({ code: 'required', message: 'fallback' }, 'toString')).toBe('is required');
    const broken = createMessageResolver({ required: (() => ({})) as never });
    expect(broken({ code: 'required', message: 'fallback' }, 'field')).toBe('fallback');
  });

  it('does not inherit a diagnostic unit from a parameter prototype', () => {
    const params = Object.assign(Object.create({ unit: 'items' }), { min: 2 });
    expect(createMessageResolver()({ code: 'min', params, message: 'fallback' }, 'value')).toBe('must be at least 2');
  });

  it('renders exact numeric operands from lossless HTTP diagnostics', () => {
    const parsed = LosslessJson.parse(
      '{"errors":[{"property":"count","message":"server fallback","code":"MaximumLengthValidator","params":{"MaxLength":9223372036854775807}}]}',
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const issue = fieldIssues({ problem: parsed.value }).count![0]!;
    expect(createMessageResolver()(issue, 'count')).toBe('must be at most 9223372036854775807');
  });
});

describe('isolated validator defaults', () => {
  it('creates independent mutable defaults for every missing value', () => {
    const create = vi.fn(() => [{ name: 'initial' }]);
    const schema = object({ items: array(object({ name: string() })).defaultFactory(create) });
    const first = schema.validate({});
    const second = schema.validate({});
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    first.value.items[0]!.name = 'changed';
    expect(second.value.items[0]!.name).toBe('initial');
    expect(create).toHaveBeenCalledTimes(2);
    schema.validate({ items: [] });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('rejects shared object defaults while accepting immutable exact values', () => {
    expect(() => array(string()).default([])).toThrow('defaultFactory');
    const parsed = ExactNumber.parse('1.25');
    if (!parsed.ok) throw new Error('Invalid fixture');
    expect(exactNumber().default(parsed.value).validate(undefined)).toEqual(parsed);
  });

  it('defaults undefined transform output once and preserves input/output types', () => {
    const create = vi.fn(() => 0);
    const schema = string()
      .transform((value) => (value === '' ? undefined : value.length))
      .defaultFactory(create);
    expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<number>();
    expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<string | undefined>();
    expect(schema.validate('')).toEqual({ ok: true, value: 0 });
    expect(create).toHaveBeenCalledOnce();
    expect(schema.validate(null).ok).toBe(false);
  });
});
