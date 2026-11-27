import { describe, expect, it } from 'vitest';
import { clampPageSizes, cursorPaging, LoadMorePageExtensions, offsetPaging } from '@src/foundation/virtualization';

const signal = new AbortController().signal;

function offsets(rows: number, total?: number) {
  return offsetPaging<number>(async ({ offset, limit }) => ({
    ok: true,
    value: {
      items: Array.from({ length: Math.max(0, Math.min(limit, rows - offset)) }, (_, index) => offset + index),
      ...(total === undefined ? {} : { total }),
    },
  }));
}

describe('offsetPaging', () => {
  it('moves the cursor by the rows read', async () => {
    const page = await offsets(100, 100).read({ cursor: 20, limit: 10, signal });
    expect(page.ok && page.value.next).toBe(30);
  });

  it('ends at an empty page, at the total, and at a short page without a total', async () => {
    const empty = await offsets(0).read({ cursor: null, limit: 10, signal });
    const atTotal = await offsets(30, 30).read({ cursor: 20, limit: 10, signal });
    const short = await offsets(25).read({ cursor: 20, limit: 10, signal });
    const full = await offsets(40).read({ cursor: 20, limit: 10, signal });
    expect(empty.ok && empty.value.next).toBeNull();
    expect(atTotal.ok && atTotal.value.next).toBeNull();
    expect(short.ok && short.value.next).toBeNull();
    expect(full.ok && full.value.next).toBe(30);
  });

  it('shifts the offset by arrivals and removals, never below zero', () => {
    const source = offsets(10);
    expect(source.shift(20, 3)).toBe(23);
    expect(source.shift(20, -1)).toBe(19);
    expect(source.shift(0, -1)).toBe(0);
  });

  it('passes a failure through unchanged', async () => {
    const source = offsetPaging<number, undefined, string>(async () => ({ ok: false, failure: 'down' }));
    expect(await source.read({ cursor: null, limit: 5, signal })).toEqual({ ok: false, failure: 'down' });
  });
});

describe('cursorPaging', () => {
  it('never moves the cursor', () => {
    const source = cursorPaging<number>(async () => ({ ok: true, value: { items: [], next: null } }));
    expect(source.shift('abc', 5)).toBe('abc');
  });
});

describe('LoadMorePageExtensions', () => {
  it('maps a token page: an absent token ends it, totalCount becomes total', () => {
    expect(LoadMorePageExtensions.fromTokenPage({ items: [1], pageSize: 1 })).toEqual({ items: [1], next: null });
    expect(
      LoadMorePageExtensions.fromTokenPage({ items: [1], pageSize: 1, nextPageToken: 't', totalCount: 9 }),
    ).toEqual({ items: [1], next: 't', total: 9 });
  });

  it('maps an offset page to its slice and total', () => {
    expect(LoadMorePageExtensions.fromOffsetPage({ items: [1, 2], pageNumber: 1, pageSize: 2, totalCount: 7 })).toEqual(
      { items: [1, 2], total: 7 },
    );
  });
});

describe('clampPageSizes', () => {
  it('floors, lifts the minimum to 1 and lets a smaller maximum win', () => {
    expect(clampPageSizes({ minimum: 0, maximum: 50 })).toEqual({ minimum: 1, maximum: 50 });
    expect(clampPageSizes({ minimum: 40, maximum: 30 })).toEqual({ minimum: 30, maximum: 30 });
    expect(clampPageSizes({ minimum: 20.7, maximum: 90.9 })).toEqual({ minimum: 20, maximum: 90 });
  });
});
