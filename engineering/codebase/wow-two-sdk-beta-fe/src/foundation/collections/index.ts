// collections — foundation seam. Pure, immutable operations over arrays, keyed collections, and trees.
// Nothing here renders, fetches, or holds state; every function takes a collection and returns a NEW one.
//
// The vector exists because these were being re-derived per component and per product — a `groupBy` in one
// table, a `uniqueBy` in one picker, a hand-rolled `arrayMove` in each drag list — and each copy answered
// the edge cases differently: whether a dedupe keeps the first or last match, whether a reorder index is
// measured before or after the removal, whether a deep comparison hangs on a cycle. Those differences are
// user-visible, so they belong in one tested model.
//
// WHY NOT A DEPENDENCY. `lodash` / `remeda` / `immer` are all deliberately absent. The SDK ships as a
// peer-light package: a single utility import must not pull a second collection library into every
// consumer's bundle, and the subset actually needed is small enough to own and test.
//
// BOUNDARY WITH `foundation/selection`. That slice is the DESCRIPTOR-DRIVEN model — `SortDescriptor`s,
// `FilterDescriptor`s, `applySort`, `compareValues` — the thing a data table's headers drive. This slice is
// strictly below it: raw array/map/set/tree shape operations with no notion of a field name, a direction,
// or a locale. Consequently this slice EXPOSES NO SORT HELPER at all. Ordering has exactly one home: use
// `applySort` for descriptor-driven sorts and `foundation/i18n`' `compareStrings` (the one cached,
// numeric-aware `Intl.Collator`) for ad-hoc text ordering. A second comparator here would let a tree order
// its rows differently from the table beside it, which is precisely the drift the SDK exists to prevent.
//
// BOUNDARY WITH `foundation/collections`' `Equality`. That helper owns the comparer VOCABULARY (`strictEquals`,
// `byKey`, `shallowEquals` over a record) and is reused here rather than re-implemented — `toggleItem`
// defaults to `Equality.strictEquals`, and `shallowEqual`'s plain-object case delegates to
// `Equality.shallowEquals`. What this slice adds is the array dispatch and the deep walk.

// Arrays — order-preserving list operations, positional edits, and the reorder that pairs with `gestures`
export {
  chunk,
  groupBy,
  insertAt,
  move,
  partition,
  range,
  removeAt,
  replaceAt,
  toggleItem,
  unique,
  unzip,
  zip,
} from './Arrays';

// Set relations over arrays — arrays in, arrays out, order defined by the first argument
export { difference, intersection, symmetricDifference, union } from './SetOps';

// Keyed collections — list to lookup, and reshaping a lookup without mutating it
export { entriesToRecord, invertRecord, keyBy, mapValues, omitKeys, pickKeys, recordToEntries } from './Records';

// Structural equality — the three memo-boundary comparisons, cheapest first
export { arrayShallowEqual, deepEqual, shallowEqual } from './Comparison';

// Trees — flat `{ id, parentId }` list to nested nodes, plus the walks over one
export { buildTree, findInTree, flattenTree, mapTree, type BuildTreeOptions, type TreeNode } from './Tree';

export { Equality, type EqualityComparer } from './Equality';
