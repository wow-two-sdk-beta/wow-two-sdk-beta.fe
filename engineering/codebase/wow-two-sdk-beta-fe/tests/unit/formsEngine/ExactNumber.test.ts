import { describe, expect, it } from 'vitest';
import { ExactNumber } from '@src/foundation/numbers';
import { LosslessJson } from '@src/foundation/json';
import { deepEqual } from '@src/formsEngine/DeepEqual';
import { snapshotFormValues } from '@src/formsEngine/FormSnapshot';

function exact(token: string): ExactNumber {
  const result = ExactNumber.parse(token);
  if (!result.ok) throw new Error('Invalid fixture');
  return result.value;
}

describe('exact numeric form values', () => {
  it('detaches editing containers while preserving authentic immutable numeric leaves', () => {
    const amount = exact('12345678901234567890.12345678901234567890');
    const source = { lines: [{ amount }] };
    const snapshot = snapshotFormValues(source);
    expect(snapshot).not.toBe(source);
    expect(snapshot.lines).not.toBe(source.lines);
    expect(snapshot.lines[0]).not.toBe(source.lines[0]);
    expect(snapshot.lines[0]?.amount).toBe(amount);
    expect(ExactNumber.isExactNumber(snapshot.lines[0]?.amount)).toBe(true);
    expect(LosslessJson.stringify(snapshot)).toEqual({
      ok: true,
      value: '{"lines":[{"amount":12345678901234567890.12345678901234567890}]}',
    });
  });

  it('compares numeric values across lexical variants and detects changed or inauthentic leaves', () => {
    const amount = exact('1.0');
    expect(deepEqual({ amount }, { amount: exact('1.00') })).toBe(true);
    expect(deepEqual({ amount }, { amount: exact('1.01') })).toBe(false);
    expect(deepEqual(amount, 1)).toBe(false);
    expect(deepEqual(amount, { ...amount })).toBe(false);
  });
});
