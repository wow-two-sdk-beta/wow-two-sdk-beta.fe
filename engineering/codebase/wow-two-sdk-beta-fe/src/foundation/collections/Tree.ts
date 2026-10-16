// Tree — turning the flat `{ id, parentId }` list an API returns into something a tree view can render,
// and walking it once it is nested.
//
// THE OUTPUT WRAPS, IT DOES NOT SPREAD. `buildTree` returns `TreeNode<T>` — `{ item, children }` — rather
// than `{ ...item, children }`. Spreading copies every row (wasteful on a large list), breaks referential
// equality against the source rows (so every memo downstream misses), and collides the moment a row has
// its own `children` field. The wrapper holds the ORIGINAL item reference.
//
// SERVER DATA IS NOT A TREE UNTIL PROVEN. Two malformed shapes arrive in practice and neither may throw or
// hang, because the alternative is a blank screen for one bad row:
//
//   1. ORPHAN — `parentId` names a row that is not in the list (deleted, or filtered out by paging). The
//      orphan is PROMOTED TO A ROOT. Dropping it would silently hide data; a root is visible and wrong in
//      a way a user can report.
//   2. CYCLE — a parent chain that loops (`a → b → c → a`, or a row that is its own parent). Every row ON
//      the cycle is PROMOTED TO A ROOT and its upward link is severed. Rows merely BELOW a cycle keep
//      their parent and nest normally under whichever cycle member became a root. Nothing is dropped and
//      every row appears exactly once. Detection visits each parent edge once, so building is O(n).
//
// Duplicate ids resolve to the first owner. Every input row has exactly one output node.
//
// `flattenTree` / `findInTree` take a `childrenKey` because a consumer's own nested shape (`items`,
// `nodes`, `subRows`) is as common as this slice's own, and both guard against a self-referential node so
// a hand-built structure cannot hang them either.

/** One node of a built tree — the source item plus the items that named it as parent. */
export interface TreeNode<T> {
  /** The source item, by reference — never a copy, so memo comparisons against the input still hit. */
  readonly item: T;
  /** The direct children, in the order the source list listed them. Empty for a leaf. */
  readonly children: ReadonlyArray<TreeNode<T>>;
}

/** The two accessors {@link buildTree} needs to read a flat list's parent/child relation. */
export interface BuildTreeOptions<T, TId> {
  /** Reads an item's own identity. */
  readonly id: (item: T) => TId;
  /** Reads the id of an item's parent, or a nullish value when the item is a root. */
  readonly parentId: (item: T) => TId | null | undefined;
}

/**
 * Nests a flat list into roots-with-children.
 *
 * Root order and sibling order both follow the input's order — no sorting happens here, deliberately.
 * Ordering a tree is `foundation/selection`'s job (`applySort` over the flat list before building, or over
 * a node's `children` after); a second comparator in this slice would let a tree order its rows
 * differently from the table beside it.
 *
 * Malformed input is tolerated, not rejected: an item whose parent is missing becomes a root, and an item
 * on a cyclic parent chain becomes a root with its upward link severed. Neither case drops an item, and
 * neither hangs. A duplicate id resolves to its first occurrence for parent lookups.
 *
 * @param items The flat list; never mutated, and its item references are reused in the result.
 * @param options The `id` / `parentId` accessors.
 * @returns A new array of root nodes.
 */
export function buildTree<T, TId>(items: ReadonlyArray<T>, options: BuildTreeOptions<T, TId>): TreeNode<T>[] {
  const byId = new Map<TId, number>();
  const nodes = items.map((item, index) => {
    const key = options.id(item);
    if (!byId.has(key)) byId.set(key, index);
    return { item, children: [] as TreeNode<T>[] };
  });
  const parents = items.map((item) => {
    const key = options.parentId(item);
    return key === null || key === undefined ? undefined : byId.get(key);
  });
  // Each parent edge is visited once. A completed chain never needs walking again.
  const completed = new Set<number>();
  const cyclic = new Set<number>();
  for (let index = 0; index < nodes.length; index++) {
    const path: number[] = [];
    const positions = new Map<number, number>();
    let current: number | undefined = index;
    while (current !== undefined && !completed.has(current)) {
      const position = positions.get(current);
      if (position !== undefined) {
        for (let offset = position; offset < path.length; offset++) cyclic.add(path[offset]!);
        break;
      }
      positions.set(current, path.length);
      path.push(current);
      current = parents[current];
    }
    for (const visited of path) completed.add(visited);
  }
  const roots: TreeNode<T>[] = [];
  nodes.forEach((node, index) => {
    const parent = parents[index];
    if (parent === undefined || cyclic.has(index)) roots.push(node);
    else nodes[parent]!.children.push(node);
  });
  return roots;
}

/** Reads a node's children under the configured key, treating anything non-array as "no children". */
function readChildren<TNode extends object>(node: TNode, childrenKey: PropertyKey): ReadonlyArray<TNode> {
  const children = (node as Record<PropertyKey, unknown>)[childrenKey];
  return Array.isArray(children) ? (children as TNode[]) : [];
}

/**
 * Walks a nested structure depth-first, pre-order, into one flat list — parent before its children, which
 * is the order a collapsed/expanded tree view renders rows in.
 *
 * A node already visited is skipped, so a self-referential structure terminates and each node appears once.
 *
 * @param nodes The roots to walk; never mutated, and node references are reused in the result.
 * @param childrenKey The property holding a node's children; defaults to `'children'`.
 * @returns A new flat array of the same node objects.
 */
export function flattenTree<TNode extends object>(
  nodes: ReadonlyArray<TNode>,
  childrenKey: PropertyKey = 'children',
): TNode[] {
  const result: TNode[] = [];
  findInTree(
    nodes,
    (node) => {
      result.push(node);
      return false;
    },
    childrenKey,
  );
  return result;
}

/**
 * Finds the first node matching a predicate, depth-first, pre-order — the lookup behind "select the node
 * for this route" and "reveal the row with this id".
 *
 * @param nodes The roots to search.
 * @param predicate Receives each node and its 0-based depth.
 * @param childrenKey The property holding a node's children; defaults to `'children'`.
 * @returns The matching node, or `undefined` when nothing matches.
 */
export function findInTree<TNode extends object>(
  nodes: ReadonlyArray<TNode>,
  predicate: (node: TNode, depth: number) => boolean,
  childrenKey: PropertyKey = 'children',
): TNode | undefined {
  const visited = new Set<TNode>();
  const stack = [{ nodes, index: 0 }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.index >= frame.nodes.length) {
      stack.pop();
      continue;
    }
    const node = frame.nodes[frame.index++]!;
    if (visited.has(node)) continue;
    visited.add(node);
    if (predicate(node, stack.length - 1)) return node;
    stack.push({ nodes: readChildren(node, childrenKey), index: 0 });
  }
  return undefined;
}

/**
 * Rebuilds a {@link TreeNode} tree with every item transformed, keeping the shape and the order.
 *
 * Typed to this slice's node shape rather than a `childrenKey`, because the result has to BE a tree: a
 * generic nested object could not be reassembled without knowing which key to write back.
 *
 * @param nodes The roots to map; never mutated.
 * @param mapFn Produces the replacement item from the current item and its 0-based depth.
 * @returns A new tree of new nodes.
 * @throws {TypeError} When the input contains a cycle; shared subtrees remain supported.
 */
export function mapTree<T, TResult>(
  nodes: ReadonlyArray<TreeNode<T>>,
  mapFn: (item: T, depth: number) => TResult,
): TreeNode<TResult>[] {
  const result: TreeNode<TResult>[] = [];
  const active = new Set<TreeNode<T>>();
  const stack: Array<{
    nodes: ReadonlyArray<TreeNode<T>>;
    index: number;
    output: TreeNode<TResult>[];
    owner?: TreeNode<T>;
  }> = [{ nodes, index: 0, output: result }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.index >= frame.nodes.length) {
      if (frame.owner) active.delete(frame.owner);
      stack.pop();
      continue;
    }
    const node = frame.nodes[frame.index++]!;
    if (active.has(node)) throw new TypeError('mapTree: cyclic input is not a tree.');
    const children: TreeNode<TResult>[] = [];
    frame.output.push({ item: mapFn(node.item, stack.length - 1), children });
    active.add(node);
    stack.push({ nodes: node.children, index: 0, output: children, owner: node });
  }
  return result;
}
