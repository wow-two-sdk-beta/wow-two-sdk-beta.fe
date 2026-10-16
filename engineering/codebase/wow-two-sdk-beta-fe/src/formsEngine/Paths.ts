/*
 * Loose string-path utilities shared by the contract pipeline and the house engine.
 * Paths use dot + index notation (`rules[0].destination`); segments are property
 * names or non-negative array indices. Deep TYPED paths are deliberately out of
 * scope — loose paths are the documented contract gap.
 */

/** A parsed path segment — a property name or an array index. */
export type PathKey = string | number;

/** An array mutation at a path — the vocabulary `AppArrayApi` compiles down to. */
export type ArrayOperation =
  | { readonly kind: 'push'; readonly value: unknown }
  | { readonly kind: 'insert'; readonly index: number; readonly value: unknown }
  | { readonly kind: 'remove'; readonly index: number }
  | { readonly kind: 'swap'; readonly indexA: number; readonly indexB: number }
  | { readonly kind: 'move'; readonly fromIndex: number; readonly toIndex: number };

/** Parses `'rules[0].destination'` into `['rules', 0, 'destination']`. Tolerant of empty segments; never throws. */
export function parsePath(path: string): ReadonlyArray<PathKey> {
  const segments: PathKey[] = [];
  let buffer = '';
  let index = 0;
  const flush = (): void => {
    if (buffer !== '') {
      segments.push(buffer);
      buffer = '';
    }
  };
  while (index < path.length) {
    const char = path.charAt(index);
    if (char === '.') {
      flush();
      index += 1;
      continue;
    }
    if (char === '[') {
      flush();
      const close = path.indexOf(']', index);
      const inner = path.slice(index + 1, close === -1 ? path.length : close);
      const parsed = Number(inner);
      segments.push(inner !== '' && Number.isInteger(parsed) && parsed >= 0 ? parsed : inner);
      index = close === -1 ? path.length : close + 1;
      continue;
    }
    buffer += char;
    index += 1;
  }
  flush();
  return segments;
}

/** Formats parsed segments back into the canonical string form (`['rules', 0] → 'rules[0]'`). */
export function formatPath(segments: ReadonlyArray<PathKey>): string {
  let path = '';
  for (const segment of segments) {
    if (typeof segment === 'number') path += `[${segment}]`;
    else path += path === '' ? segment : `.${segment}`;
  }
  return path;
}

/** Reads the value at a path; `undefined` when any hop is missing or non-object. */
export function getPath(target: unknown, path: string): unknown {
  let current: unknown = target;
  for (const segment of parsePath(path)) {
    if (current === null || typeof current !== 'object') return undefined;
    if (!Object.hasOwn(current, segment)) return undefined;
    current = (current as Record<PropertyKey, unknown>)[segment];
  }
  return current;
}

/**
 * Checks structural presence of a path — used to decide whether a mapped server
 * error path "matches a field". Array hops require the index to be in range.
 */
export function hasPath(target: unknown, path: string): boolean {
  const segments = parsePath(path);
  if (segments.length === 0) return false;
  let current: unknown = target;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return false;
    if (Array.isArray(current)) {
      if (typeof segment !== 'number' || segment < 0 || segment >= current.length) return false;
    }
    if (!Object.hasOwn(current, segment)) return false;
    current = (current as Record<PropertyKey, unknown>)[segment];
  }
  return true;
}

/** Sets the value at a path immutably — clones only the spine, keeps untouched branches by reference. */
export function setPath<T>(target: T, path: string, value: unknown): T {
  const segments = parsePath(path);
  if (segments.length === 0) return target;
  return setAtDepth(target, segments, 0, value) as T;
}

function setAtDepth(current: unknown, segments: ReadonlyArray<PathKey>, depth: number, value: unknown): unknown {
  const segment = segments[depth];
  if (segment === undefined) return value;
  if (typeof segment === 'number') {
    const array: unknown[] = Array.isArray(current) ? [...(current as unknown[])] : [];
    array[segment] = setAtDepth(array[segment], segments, depth + 1, value);
    return array;
  }
  const object: Record<string, unknown> =
    current !== null && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  const previous = Object.hasOwn(object, segment) ? object[segment] : undefined;
  Object.defineProperty(object, segment, {
    value: setAtDepth(previous, segments, depth + 1, value),
    enumerable: true,
    configurable: true,
    writable: true,
  });
  return object;
}

/** Applies an array operation to a row array in place (callers pass a fresh copy). Indices are assumed in range. */
export function mutateRows(rows: unknown[], operation: ArrayOperation): void {
  switch (operation.kind) {
    case 'push':
      rows.push(operation.value);
      return;
    case 'insert':
      rows.splice(operation.index, 0, operation.value);
      return;
    case 'remove':
      rows.splice(operation.index, 1);
      return;
    case 'swap': {
      const valueA = rows[operation.indexA];
      rows[operation.indexA] = rows[operation.indexB];
      rows[operation.indexB] = valueA;
      return;
    }
    case 'move': {
      const [moved] = rows.splice(operation.fromIndex, 1);
      rows.splice(operation.toIndex, 0, moved);
      return;
    }
  }
}

/**
 * Remaps a row index through an array operation: `null` = the entry belongs to a
 * removed row and should be dropped; otherwise the index the row now lives at.
 */
function remapRowIndex(index: number, operation: ArrayOperation): number | null {
  switch (operation.kind) {
    case 'push':
      return index;
    case 'insert':
      return index >= operation.index ? index + 1 : index;
    case 'remove':
      if (index === operation.index) return null;
      return index > operation.index ? index - 1 : index;
    case 'swap':
      if (index === operation.indexA) return operation.indexB;
      if (index === operation.indexB) return operation.indexA;
      return index;
    case 'move': {
      const { fromIndex, toIndex } = operation;
      if (index === fromIndex) return toIndex;
      if (fromIndex < toIndex && index > fromIndex && index <= toIndex) return index - 1;
      if (fromIndex > toIndex && index >= toIndex && index < fromIndex) return index + 1;
      return index;
    }
  }
}

/**
 * Remaps a single row-scoped path key (`rules[1].destination`) through an array
 * operation at `arrayPath`. Returns the key unchanged when it does not sit under
 * a row of that array, or `null` when its row was removed.
 */
export function remapPathKey(key: string, arrayPath: string, operation: ArrayOperation): string | null {
  const keySegments = parsePath(key);
  const arraySegments = parsePath(arrayPath);
  if (keySegments.length <= arraySegments.length) return key;
  for (let index = 0; index < arraySegments.length; index += 1) {
    if (keySegments[index] !== arraySegments[index]) return key;
  }
  const rowIndex = keySegments[arraySegments.length];
  if (typeof rowIndex !== 'number') return key;
  const remapped = remapRowIndex(rowIndex, operation);
  if (remapped === null) return null;
  if (remapped === rowIndex) return key;
  const nextSegments = [...keySegments];
  nextSegments[arraySegments.length] = remapped;
  return formatPath(nextSegments);
}

/** Remaps every row-scoped key of an error map through an array operation; removed-row entries drop. */
export function remapPathMap(
  map: Readonly<Record<string, ReadonlyArray<string>>>,
  arrayPath: string,
  operation: ArrayOperation,
): Readonly<Record<string, ReadonlyArray<string>>> {
  const next: Record<string, ReadonlyArray<string>> = Object.create(null);
  for (const [key, messages] of Object.entries(map)) {
    const remapped = remapPathKey(key, arrayPath, operation);
    if (remapped !== null) next[remapped] = messages;
  }
  return next;
}

/** Remaps every row-scoped member of a touched set through an array operation; removed-row entries drop. */
export function remapPathSet(
  set: ReadonlySet<string>,
  arrayPath: string,
  operation: ArrayOperation,
): ReadonlySet<string> {
  const next = new Set<string>();
  for (const key of set) {
    const remapped = remapPathKey(key, arrayPath, operation);
    if (remapped !== null) next.add(remapped);
  }
  return next;
}
