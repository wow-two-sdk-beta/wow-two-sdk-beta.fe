import { describe, expect, it, vi } from 'vitest';
import { abortable, pLimit, withTimeout } from '@src/foundation/async';

describe('async cancellation ownership', () => {
  it.each(['abortable', 'timeout'] as const)(
    'observes already-started work even when %s starts cancelled',
    async (mode) => {
      const controller = new AbortController();
      controller.abort();
      const work = Promise.reject(new Error('late transport failure'));
      const then = vi.spyOn(work, 'then');
      const result =
        mode === 'abortable'
          ? abortable(work, controller.signal)
          : withTimeout(work, 100, { signal: controller.signal });
      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
      expect(then).toHaveBeenCalled();
    },
  );

  it('cleans timeout resources when a thenable throws during assimilation', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const work = {
      then: () => {
        throw new Error('broken thenable');
      },
    } as PromiseLike<string>;
    await expect(withTimeout(work, 100, { signal: controller.signal })).rejects.toThrow('broken thenable');
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    vi.useRealTimers();
  });

  it('rejects NaN concurrency instead of parking work permanently', () => {
    expect(() => pLimit(Number.NaN)).toThrow(RangeError);
  });
});
