import { expect, it } from 'vitest';
import { parseIsoDate } from '../../../../src/foundation/datetime/IsoDate';
import { eachDayOfInterval } from '../../../../src/foundation/datetime/Interval';
it('rejects impossible date-time days before native Date normalization', () => {
  expect(parseIsoDate('2026-02-30T12:00:00Z')).toBeNull();
  expect(parseIsoDate('2025-02-29T12:00:00+05:00')).toBeNull();
  expect(parseIsoDate('2024-02-29T12:00:00Z')).not.toBeNull();
});
it('keeps reversed intervals empty even within one calendar day', () => {
  expect(eachDayOfInterval(new Date(2026, 2, 1, 12), new Date(2026, 2, 1, 11))).toEqual([]);
});
