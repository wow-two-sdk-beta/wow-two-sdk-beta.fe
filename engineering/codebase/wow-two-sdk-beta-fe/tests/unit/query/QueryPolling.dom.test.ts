import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { runWithQuery, createTestQueryClient } from '@src/query/adapters/tanstack/QueryTestUtils';
import { useAppQuery } from '@src/query';
import { ResultExtensions as R } from '@src/foundation/results';

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.useRealTimers();
});

it('polls while the interval getter returns a number and stops once it returns false', async () => {
  vi.useFakeTimers();
  const client = createTestQueryClient();
  const isRunning = ref(true);
  const queryFn = vi.fn(async () => R.ok(isRunning.value));
  const host = runWithQuery(
    () => useAppQuery({ key: ['job'], queryFn, refetchInterval: () => (isRunning.value ? 1_000 : false) }),
    client,
  );
  cleanups.push(() => {
    host.unmount();
    client.clear();
  });

  await flushPromises();
  expect(queryFn).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(1_000);
  await flushPromises();
  expect(queryFn).toHaveBeenCalledTimes(2);

  isRunning.value = false;
  await flushPromises();
  await vi.advanceTimersByTimeAsync(3_000);
  await flushPromises();
  expect(queryFn.mock.calls.length).toBeLessThanOrEqual(3);
  const settled = queryFn.mock.calls.length;
  await vi.advanceTimersByTimeAsync(3_000);
  expect(queryFn).toHaveBeenCalledTimes(settled);
});
