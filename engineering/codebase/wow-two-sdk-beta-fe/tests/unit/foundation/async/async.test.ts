import { describe, expect, it } from 'vitest';
import { allSettledValues, deferred, pLimit, sequential, TimeoutError, withTimeout } from '@src/foundation/async';

/*
 * Smoke depth, `unit` project (node). Real timers, tiny delays — the assertions are about which
 * promise settles and how many run at once, never about wall-clock precision.
 */

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('deferred', () => {
  it('resolves from the outside', async () => {
    const gate = deferred<string>();
    gate.resolve('done');
    await expect(gate.promise).resolves.toBe('done');
  });

  it('rejects from the outside', async () => {
    const gate = deferred<string>();
    gate.reject(new Error('nope'));
    await expect(gate.promise).rejects.toThrow('nope');
  });
});

describe('withTimeout', () => {
  it('passes a value through when it settles in time', async () => {
    await expect(withTimeout(Promise.resolve(7), 50)).resolves.toBe(7);
  });

  it('rejects with a TimeoutError when it does not', async () => {
    await expect(withTimeout(wait(100), 5)).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe('pLimit', () => {
  it('never runs more than `concurrency` tasks at once', async () => {
    const limit = pLimit(2);
    let running = 0;
    let peak = 0;

    const task = async (): Promise<void> => {
      running += 1;
      peak = Math.max(peak, running);
      await wait(5);
      running -= 1;
    };

    await Promise.all([limit.run(task), limit.run(task), limit.run(task), limit.run(task), limit.run(task)]);

    expect(peak).toBeLessThanOrEqual(2);
    expect(limit.activeCount()).toBe(0);
    expect(limit.pendingCount()).toBe(0);
  });
});

describe('combinators', () => {
  it('sequential runs tasks one after another, in order', async () => {
    const order: number[] = [];
    const results = await sequential([
      async () => {
        await wait(10);
        order.push(1);
        return 'a';
      },
      async () => {
        order.push(2);
        return 'b';
      },
    ]);

    expect(order).toEqual([1, 2]);
    expect(results).toEqual(['a', 'b']);
  });

  it('allSettledValues keeps the fulfilled values and drops the rejections', async () => {
    const values = await allSettledValues([
      Promise.resolve('kept'),
      Promise.reject(new Error('dropped')),
      Promise.resolve('also kept'),
    ]);

    expect(values).toEqual(['kept', 'also kept']);
  });
});
