import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useRefresh } from '@src/query';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function track(refetch: () => unknown, minDuration?: number) {
  const scope = effectScope();
  const state = scope.run(() => useRefresh(refetch, minDuration === undefined ? {} : { minDuration }))!;
  return { scope, ...state };
}

describe('useRefresh', () => {
  it('stays refreshing for the minimum duration even when the refetch answers at once', async () => {
    const { refresh, refreshing, scope } = track(() => Promise.resolve('fresh'));
    const done = refresh();
    expect(refreshing.value).toBe(true);
    await vi.advanceTimersByTimeAsync(399);
    expect(refreshing.value).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(refreshing.value).toBe(false);
    scope.stop();
  });

  it('waits for a slow refetch past the minimum duration', async () => {
    let finish: () => void = () => undefined;
    const { refresh, refreshing, scope } = track(() => new Promise<void>((resolve) => (finish = resolve)), 100);
    const done = refresh();
    await vi.advanceTimersByTimeAsync(500);
    expect(refreshing.value).toBe(true);
    finish();
    await done;
    expect(refreshing.value).toBe(false);
    scope.stop();
  });

  it('shares one pending state across overlapping clicks and ends after a failure', async () => {
    const { refresh, refreshing, scope } = track(() => Promise.reject(new Error('offline')), 100);
    const first = refresh();
    await vi.advanceTimersByTimeAsync(50);
    const second = refresh();
    await vi.advanceTimersByTimeAsync(60);
    await first;
    expect(refreshing.value).toBe(true);
    await vi.advanceTimersByTimeAsync(50);
    await second;
    expect(refreshing.value).toBe(false);
    scope.stop();
  });

  it('settles without updating once its scope is disposed', async () => {
    const { refresh, refreshing, scope } = track(() => Promise.resolve(), 1000);
    const done = refresh();
    scope.stop();
    await done;
    expect(refreshing.value).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
