import { describe, expect, it } from 'vitest';
import { createUndoHistory } from '@src/foundation/history';

describe('large action groups', () => {
  it.each(['transaction', 'coalescing'] as const)('replays 30000 actions without recursion: %s', (mode) => {
    const history = createUndoHistory({ now: () => 0 });
    const values: number[] = [];
    const record = (): void => {
      for (let index = 0; index < 30_000; index += 1) {
        history.execute({
          coalesceKey: mode === 'coalescing' ? 'typing' : undefined,
          do: () => {
            values.push(index);
          },
          undo: () => {
            expect(values.pop()).toBe(index);
          },
        });
      }
    };
    if (mode === 'transaction') history.transact('batch', record);
    else record();
    expect(history.size).toBe(1);
    expect(history.undo()).toBe(true);
    expect(values).toEqual([]);
    expect(history.redo()).toBe(true);
    expect(values).toEqual(Array.from({ length: 30_000 }, (_, index) => index));
  });
});
