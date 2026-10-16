import { describe, expect, it } from 'vitest';
import { isoDate, uuid } from '@src/foundation/validators';

describe('format boundaries', () => {
  it.each(['0000-02-29', '0001-01-01', '0099-12-31'])('accepts the exact calendar year %s', (value) => {
    expect(isoDate().validate(value).ok).toBe(true);
  });
  it.each(['\n', '\r', '\r\n', '\u2028', '\u2029'])('rejects trailing line terminator %j', (suffix) => {
    expect(isoDate().validate(`2026-09-13${suffix}`).ok).toBe(false);
    expect(uuid().validate(`550e8400-e29b-41d4-a716-446655440000${suffix}`).ok).toBe(false);
  });
  it('rejects a false leap day in the early calendar years', () => {
    expect(isoDate().validate('0001-02-29').ok).toBe(false);
  });
});
