import { describe, expect, it } from 'vitest';
import { buildTree, flattenTree, findInTree, mapTree } from '../../../../src/foundation/collections/Tree';
import {
  entriesToRecord,
  mapValues,
  omitKeys,
  pickKeys,
  invertRecord,
} from '../../../../src/foundation/collections/Records';
import { arrayShallowEqual, deepEqual } from '../../../../src/foundation/collections/Comparison';

describe('collection scale and data fidelity', () => {
  it('builds and traverses a deep hierarchy without recursion or repeated parent reads', () => {
    const items = Array.from({ length: 12000 }, (_, id) => ({ id, parentId: id === 0 ? null : id - 1 }));
    let parentReads = 0;
    const tree = buildTree(items, {
      id: (row) => row.id,
      parentId: (row) => {
        parentReads++;
        return row.parentId;
      },
    });
    expect(parentReads).toBeLessThanOrEqual(items.length * 3);
    expect(flattenTree(tree)).toHaveLength(items.length);
    expect(findInTree(tree, (node, depth) => node.item.id === 11999 && depth === 11999)?.item).toBe(items[11999]);
    const mapped = mapTree(tree, (item, depth) => `${item.id}:${depth}`);
    expect(flattenTree(mapped).at(-1)?.item).toBe('11999:11999');
  });

  it('attaches children to the first duplicate owner exactly once', () => {
    const rows = [
      { id: 1, parentId: null },
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
    ];
    const tree = buildTree(rows, { id: (row) => row.id, parentId: (row) => row.parentId });
    expect(flattenTree(tree).map((node) => node.item)).toEqual([rows[0], rows[2], rows[1]]);
  });

  it('promotes cycles including NaN identities while retaining descendants', () => {
    const rows = [
      { id: NaN, parentId: 1 },
      { id: 1, parentId: NaN },
      { id: 2, parentId: 1 },
    ];
    const tree = buildTree(rows, { id: (row) => row.id, parentId: (row) => row.parentId });
    expect(tree.map((node) => node.item.id)).toEqual([NaN, 1]);
    expect(flattenTree(tree)).toHaveLength(3);
  });

  it('preserves prototype-named keys as own data across record transforms', () => {
    const value = { data: true };
    const record = JSON.parse('{"__proto__":1,"constructor":2,"keep":3}') as Record<string, number>;
    for (const output of [
      entriesToRecord([['__proto__', value]]),
      mapValues(record, () => value),
      pickKeys(record, ['__proto__']),
      omitKeys(record, ['keep']),
      invertRecord({ source: '__proto__' }),
    ]) {
      expect(Object.hasOwn(output, '__proto__')).toBe(true);
      expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
    }
  });

  it('does not skip sparse array positions during equality checks', () => {
    expect(arrayShallowEqual(new Array(1), [1])).toBe(false);
    expect(deepEqual(new Array(1), [1])).toBe(false);
    expect(deepEqual([1], new Array(1))).toBe(false);
  });
});

import { range, removeAt, replaceAt } from '../../../../src/foundation/collections/Arrays';
it('rejects a range step too small to advance the native number', () => {
  expect(() => range(1e20, 1e21, 1)).toThrow(RangeError);
  expect(() => range(-1e20, -1e21, -1)).toThrow(RangeError);
});
it('does not remove the first item or add a NaN property for an invalid index', () => {
  expect(removeAt([1, 2], NaN)).toEqual([1, 2]);
  expect(replaceAt([1, 2], NaN, 3)).toEqual([1, 2]);
});

import { ExactNumber } from '../../../../src/foundation/numbers';
import { shallowEqual } from '../../../../src/foundation/collections/Comparison';
import { Equality } from '../../../../src/foundation/collections/Equality';
it('compares exact-number values instead of their empty public field lists', () => {
  const one = ExactNumber.parse('1'),
    same = ExactNumber.parse('1.00'),
    two = ExactNumber.parse('2');
  if (!one.ok || !same.ok || !two.ok) throw new Error('Invalid test number');
  expect(deepEqual({ amount: one.value }, { amount: two.value })).toBe(false);
  expect(deepEqual(one.value, same.value)).toBe(true);
  expect(shallowEqual(one.value, two.value)).toBe(false);
  expect(shallowEqual(one.value, {})).toBe(false);
  expect(Equality.shallowEquals({ amount: one.value }, { amount: same.value })).toBe(false);
});
