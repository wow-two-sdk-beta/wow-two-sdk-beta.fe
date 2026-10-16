import { describe, expect, it } from 'vitest';
import {
  buildTree,
  deepEqual,
  flattenTree,
  groupBy,
  keyBy,
  move,
  shallowEqual,
  unique,
} from '@src/foundation/collections';

/*
 * Smoke depth, `unit` project (node). The slice exists because these were being re-derived per
 * component and each copy answered the edge cases differently, so the assertions below are the
 * edge cases rather than the happy paths: which duplicate `unique` keeps, whether `move`'s
 * target index is measured before or after the removal, and that `deepEqual` terminates on a
 * cycle instead of blowing the stack.
 */

describe('immutability', () => {
  it('never mutates the input array', () => {
    const source = [1, 2, 3];
    move(source, 0, 2);
    expect(source).toEqual([1, 2, 3]);
  });
});

describe('unique', () => {
  it('keeps the first occurrence', () => {
    expect(unique([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
  });
});

describe('move', () => {
  /* The target index is read AFTER the removal — the off-by-one every hand-rolled copy got
     differently, and the one a drag-and-drop list renders wrong. */
  it('measures the target index after the removal', () => {
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
});

describe('groupBy / keyBy', () => {
  const rows = [
    { id: 1, kind: 'a' },
    { id: 2, kind: 'b' },
    { id: 3, kind: 'a' },
  ];

  it('groups every member under its key, in order', () => {
    const grouped = groupBy(rows, (row) => row.kind);
    expect(grouped.get('a')?.map((row) => row.id)).toEqual([1, 3]);
    expect(grouped.get('b')?.map((row) => row.id)).toEqual([2]);
  });

  it('keys a list into a lookup', () => {
    expect(keyBy(rows, (row) => row.id).get(2)?.kind).toBe('b');
  });
});

describe('equality', () => {
  it('separates shallow from deep', () => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
  });

  it('terminates on a cycle rather than recursing forever', () => {
    const first: Record<string, unknown> = { name: 'x' };
    const second: Record<string, unknown> = { name: 'x' };
    first.self = first;
    second.self = second;

    expect(() => deepEqual(first, second)).not.toThrow();
  });
});

describe('trees', () => {
  it('nests a flat parent-id list and flattens it back', () => {
    const flat = [
      { id: 1, parentId: null, label: 'root' },
      { id: 2, parentId: 1, label: 'child' },
      { id: 3, parentId: 2, label: 'grandchild' },
    ];

    const tree = buildTree(flat, {
      id: (row) => row.id,
      parentId: (row) => row.parentId,
    });

    expect(tree).toHaveLength(1);
    expect(flattenTree(tree)).toHaveLength(3);
  });
});
