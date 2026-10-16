import { describe, expect, it } from 'vitest';
import { ExactNumber } from '@src/foundation/numbers';
import { exactNumber, object } from '@src/foundation/validators';

function exact(token: string) {
  const result = ExactNumber.parse(token);
  if (!result.ok) throw new Error('Invalid exact-number fixture.');
  return result.value;
}

describe('exact-number validation', () => {
  it('retains the exact instance at a decoded API boundary', () => {
    const value = exact('9223372036854775807');
    expect(object({ scanCount: exactNumber() }).validate({ scanCount: value })).toEqual({
      ok: true,
      value: { scanCount: value },
    });
  });

  it.each([9223372036854776000, '9223372036854775807', 1n])('rejects an unparsed wire value', (value) => {
    expect(exactNumber().validate(value)).toMatchObject({
      ok: false,
      failure: { issues: [{ code: 'type', path: [] }] },
    });
  });
});

it('compares exact validation limits without binary64 conversion', () => {
  const schema = exactNumber().min(exact('9223372036854775807')).max(exact('9223372036854775808')).integer();
  expect(schema.validate(exact('9223372036854775807')).ok).toBe(true);
  expect(schema.validate(exact('9223372036854775808')).ok).toBe(true);
  expect(schema.validate(exact('9223372036854775806')).ok).toBe(false);
  expect(schema.validate(exact('9223372036854775809')).ok).toBe(false);
  expect(schema.validate(exact('9223372036854775807.5')).ok).toBe(false);
});
