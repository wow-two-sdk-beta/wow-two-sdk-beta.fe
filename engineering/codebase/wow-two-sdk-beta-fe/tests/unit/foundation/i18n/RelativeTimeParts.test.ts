import { describe, expect, it } from 'vitest';
import { toRelativeTimeParts } from '@src/foundation/i18n';

const now = Date.UTC(2026, 9, 15, 12, 0, 0);
const seconds = (count: number): number => now + count * 1000;

describe('toRelativeTimeParts', () => {
  it.each([
    [seconds(-30), { value: -30, unit: 'second' }],
    [seconds(-59.6), { value: -1, unit: 'minute' }],
    [seconds(-90 * 60), { value: -2, unit: 'hour' }],
    [seconds(-3 * 86_400), { value: -3, unit: 'day' }],
    [seconds(14 * 86_400), { value: 2, unit: 'week' }],
    [seconds(-60 * 86_400), { value: -2, unit: 'month' }],
    [seconds(-800 * 86_400), { value: -2, unit: 'year' }],
  ] as const)('reads %s in the unit a reader expects', (target, expected) => {
    expect(toRelativeTimeParts(target, now)).toEqual(expected);
  });

  it('accepts dates and ISO strings, and reads zero as now without a signed zero', () => {
    expect(toRelativeTimeParts(new Date(now), now)).toEqual({ value: 0, unit: 'second' });
    expect(Object.is(toRelativeTimeParts(seconds(-0.2), now)!.value, -0)).toBe(false);
    expect(toRelativeTimeParts(new Date(seconds(-120)).toISOString(), now)).toEqual({ value: -2, unit: 'minute' });
  });

  it('returns null for an unreadable instant', () => {
    expect(toRelativeTimeParts('not a date', now)).toBeNull();
  });
});
