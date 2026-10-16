import { shallowRef } from 'vue';
import { getPath, mutateRows, parsePath, remapPathKey, type ArrayOperation } from './Paths';

/** Form-owned row identity shared by every binding and direct array operation. */
export function createFormArrayIdentity(values: () => unknown) {
  let sequence = 0;
  let entries = new Map<string, readonly string[]>();
  const revision = shallowRef(0);
  const fresh = (): string => `far-${sequence++}`;
  const size = (path: string): number => {
    const rows = getPath(values(), path);
    return Array.isArray(rows) ? rows.length : 0;
  };
  const keys = (path: string): readonly string[] => {
    void revision.value;
    let current = entries.get(path);
    if (!current) {
      current = Array.from({ length: size(path) }, fresh);
      entries.set(path, current);
    }
    return current;
  };
  return {
    keys,
    operation(path: string, operation: ArrayOperation, run: () => void): void {
      const length = size(path);
      const index = (value: number, end = length - 1): boolean => Number.isInteger(value) && value >= 0 && value <= end;
      if (operation.kind === 'insert' && !index(operation.index, length)) return;
      if (operation.kind === 'remove' && !index(operation.index)) return;
      if (operation.kind === 'swap' && (!index(operation.indexA) || !index(operation.indexB))) return;
      if (operation.kind === 'move' && (!index(operation.fromIndex) || !index(operation.toIndex))) return;
      const next = [...keys(path)];
      mutateRows(
        next,
        operation.kind === 'push' || operation.kind === 'insert' ? { ...operation, value: fresh() } : operation,
      );
      const remapped = new Map<string, readonly string[]>();
      for (const [key, value] of entries) {
        const target = remapPathKey(key, path, operation);
        if (target !== null) remapped.set(target, value);
      }
      remapped.set(path, next);
      entries = remapped;
      run();
      revision.value += 1;
    },
    replace(path: string): void {
      const written = parsePath(path);
      let changed = false;
      for (const [key, current] of entries) {
        const target = parsePath(key);
        const common = Math.min(target.length, written.length);
        if (!target.slice(0, common).every((part, index) => part === written[index])) continue;
        if (written.length <= target.length) {
          entries.delete(key);
          changed = true;
        } else if (written.length === target.length + 1 && typeof written[target.length] === 'number') {
          const next = [...current];
          const row = written[target.length] as number;
          if (row >= 0 && row < next.length) next[row] = fresh();
          entries.set(key, next);
          changed = true;
        }
      }
      if (changed) revision.value += 1;
    },
    reset(): void {
      entries.clear();
      revision.value += 1;
    },
  };
}
