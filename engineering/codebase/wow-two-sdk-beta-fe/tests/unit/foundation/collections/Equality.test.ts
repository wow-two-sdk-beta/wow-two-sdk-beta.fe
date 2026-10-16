import { describe, expect, it } from 'vitest';
import { Equality } from '@src/foundation/collections';

describe('Equality', () => {
  it('compares records one level deep', () => {
    expect(Equality.shallowEquals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(Equality.shallowEquals({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('strictEquals is reference equality, not structural', () => {
    const value = { a: 1 };
    expect(Equality.strictEquals(value, value)).toBe(true);
    expect(Equality.strictEquals({ a: 1 }, { a: 1 })).toBe(false);
  });
});
