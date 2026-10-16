/** A line-level edit; line numbers stay one-based and absent sides are null. */
export interface DiffRow {
  op: 'unchanged' | 'added' | 'removed';
  leftNum: number | null;
  rightNum: number | null;
  text: string;
}

/** Computes an exact LCS diff with linear working memory and common-edge trimming. */
export function computeDiff(left: string, right: string): ReadonlyArray<DiffRow> {
  const a = left.split('\n');
  const b = right.split('\n');
  const matches: Array<readonly [number, number]> = [];

  function lengths(a0: number, a1: number, b0: number, b1: number, reverse: boolean): Uint32Array {
    const width = b1 - b0;
    const row = new Uint32Array(width + 1);
    for (let offset = 0; offset < a1 - a0; offset++) {
      let diagonal = 0;
      const text = a[reverse ? a1 - 1 - offset : a0 + offset];
      for (let j = 1; j <= width; j++) {
        const previous = row[j]!;
        row[j] = text === b[reverse ? b1 - j : b0 + j - 1] ? diagonal + 1 : Math.max(previous, row[j - 1]!);
        diagonal = previous;
      }
    }
    return row;
  }

  // Working rows and the set leave the stack before either recursive child runs.
  function findSplit(a0: number, middle: number, a1: number, b0: number, b1: number): number | undefined {
    const rightLines = new Set(b.slice(b0, b1));
    let intersects = false;
    for (let i = a0; i < a1 && !intersects; i++) intersects = rightLines.has(a[i]!);
    if (!intersects) return undefined;
    const forward = lengths(a0, middle, b0, b1, false);
    const backward = lengths(middle, a1, b0, b1, true);
    let best = -1;
    let split = 0;
    for (let j = 0; j <= b1 - b0; j++) {
      const score = forward[j]! + backward[b1 - b0 - j]!;
      if (score > best) {
        best = score;
        split = j;
      }
    }
    return split;
  }

  function visit(a0: number, a1: number, b0: number, b1: number): void {
    while (a0 < a1 && b0 < b1 && a[a0] === b[b0]) matches.push([a0++, b0++]);
    let suffix = 0;
    while (a0 < a1 && b0 < b1 && a[a1 - 1] === b[b1 - 1]) {
      a1--;
      b1--;
      suffix++;
    }
    if (a0 < a1 && b0 < b1) {
      if (a1 - a0 === 1) {
        for (let j = b0; j < b1; j++)
          if (a[a0] === b[j]) {
            matches.push([a0, j]);
            break;
          }
      } else {
        const middle = Math.floor((a0 + a1) / 2);
        const split = findSplit(a0, middle, a1, b0, b1);
        if (split !== undefined) {
          visit(a0, middle, b0, b0 + split);
          visit(middle, a1, b0 + split, b1);
        }
      }
    }
    for (let offset = 0; offset < suffix; offset++) matches.push([a1 + offset, b1 + offset]);
  }
  visit(0, a.length, 0, b.length);
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  for (const [ai, bj] of [...matches, [a.length, b.length] as const]) {
    while (i < ai) rows.push({ op: 'removed', leftNum: ++i, rightNum: null, text: a[i - 1]! });
    while (j < bj) rows.push({ op: 'added', leftNum: null, rightNum: ++j, text: b[j - 1]! });
    if (ai < a.length) rows.push({ op: 'unchanged', leftNum: ++i, rightNum: ++j, text: a[i - 1]! });
  }
  return rows;
}
