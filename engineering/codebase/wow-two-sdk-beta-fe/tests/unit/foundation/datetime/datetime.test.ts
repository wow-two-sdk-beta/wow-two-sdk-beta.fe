import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  clampDate,
  differenceInDays,
  endOfDay,
  isSameDay,
  maxDate,
  startOfDay,
  startOfMonth,
} from '@src/foundation/datetime';

/*
 * Smoke depth, `unit` project (node). Every op returns a NEW `Date`; the input is never mutated.
 * The one non-obvious rule the slice documents is `addMonths`' CLAMP — Jan 31 + 1 month is the
 * end of February, never a rollover into March — so that is asserted rather than the arithmetic
 * that cannot go wrong.
 */

describe('immutability', () => {
  it('returns a new Date and leaves the input alone', () => {
    const source = new Date(2026, 7, 13, 9, 30);
    const moved = addDays(source, 5);

    expect(moved).not.toBe(source);
    expect(source.getDate()).toBe(13);
    expect(moved.getDate()).toBe(18);
  });
});

describe('addMonths', () => {
  it('clamps to the target month rather than overflowing into the next', () => {
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
    // 2028 is a leap year — the clamp follows the real month length, not a fixed 28.
    expect(addMonths(new Date(2028, 0, 31), 1)).toEqual(new Date(2028, 1, 29));
  });
});

describe('boundaries', () => {
  it('start and end of day bracket the same calendar day', () => {
    const noon = new Date(2026, 7, 13, 12, 0, 0);

    expect(startOfDay(noon).getHours()).toBe(0);
    expect(endOfDay(noon).getHours()).toBe(23);
    expect(isSameDay(startOfDay(noon), endOfDay(noon))).toBe(true);
  });

  it('start of month lands on the first', () => {
    expect(startOfMonth(new Date(2026, 7, 13)).getDate()).toBe(1);
  });
});

describe('comparison', () => {
  /* Signed and directional: positive when `to` is later than `from`. A caller who reads the
     argument order backwards gets a negative count, not an absolute one. */
  it('counts signed calendar days from the first date to the second', () => {
    expect(differenceInDays(new Date(2026, 7, 13), new Date(2026, 7, 20))).toBe(7);
    expect(differenceInDays(new Date(2026, 7, 20), new Date(2026, 7, 13))).toBe(-7);
  });

  it('picks the later date and clamps into a range', () => {
    const early = new Date(2026, 0, 1);
    const late = new Date(2026, 11, 31);

    expect(maxDate(early, late)).toEqual(late);
    expect(clampDate(new Date(2025, 0, 1), early, late)).toEqual(early);
    expect(clampDate(new Date(2027, 0, 1), early, late)).toEqual(late);
  });
});
