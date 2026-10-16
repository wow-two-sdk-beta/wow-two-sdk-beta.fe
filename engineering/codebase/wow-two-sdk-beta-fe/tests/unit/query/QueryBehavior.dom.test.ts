import { ref, nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { runWithQuery, createTestQueryClient } from '@src/query/adapters/tanstack/QueryTestUtils';
import { useAppQuery, useAppPaginatedQuery, useAppLazyQuery, useOptimisticMutation, prefetchProps } from '@src/query';
import { ApiFailureFactory } from '@src/foundation/http';
import { ResultExtensions as R, type Result } from '@src/foundation/results';
import type { ApiFailure } from '@src/foundation/http';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { resolve, promise };
}
const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
});
function harness<T>(use: () => T, client = createTestQueryClient()) {
  const host = runWithQuery(use, client);
  cleanups.push(() => {
    host.unmount();
    client.clear();
  });
  return host;
}

it('serializes overlapping optimistic writes and prevents stale rollback erasing a later success', async () => {
  const client = createTestQueryClient();
  client.setQueryData(['counter'], 0);
  const first = deferred<Result<number, ApiFailure>>();
  const mutationFn = vi.fn((value: number) => (value === 1 ? first.promise : Promise.resolve(R.ok(value))));
  const { result } = harness(
    () =>
      useOptimisticMutation({
        mutationFn,
        targets: [{ key: ['counter'], apply: (current: unknown, amount: number) => Number(current) + amount }],
      }),
    client,
  );
  const pendingA = result.mutateAsync(1);
  await flushPromises();
  const pendingB = result.mutateAsync(2);
  await flushPromises();
  expect(client.getQueryData(['counter'])).toBe(1);
  expect(mutationFn).toHaveBeenCalledTimes(1);
  first.resolve(R.fail(ApiFailureFactory.create('http')));
  expect(await pendingA).toMatchObject({ ok: false });
  expect(await pendingB).toEqual(R.ok(2));
  expect(client.getQueryData(['counter'])).toBe(2);
});
it('rolls back a partial multi-target apply and releases the queue after programmer failure', async () => {
  const client = createTestQueryClient();
  client.setQueryData(['a'], 1);
  client.setQueryData(['b'], 2);
  const { result } = harness(
    () =>
      useOptimisticMutation({
        mutationFn: async (value: number) => R.ok(value),
        invalidateOnSettle: false,
        targets: [
          { key: ['a'], apply: (_current, value: number) => value },
          {
            key: ['b'],
            apply: (_current, value: number) => {
              if (value === 3) throw new Error('patch bug');
              return value;
            },
          },
        ],
      }),
    client,
  );
  await expect(result.mutateAsync(3)).rejects.toThrow('patch bug');
  expect(client.getQueryData(['a'])).toBe(1);
  expect(client.getQueryData(['b'])).toBe(2);
  await expect(result.mutateAsync(4)).resolves.toEqual(R.ok(4));
  expect(client.getQueryData(['a'])).toBe(4);
});
it('keeps optimistic queues and explicit prefetch helpers isolated between clients', async () => {
  const first = createTestQueryClient();
  const second = createTestQueryClient();
  const pending = deferred<Result<number, ApiFailure>>();
  const a = harness(() => useOptimisticMutation({ mutationFn: () => pending.promise, targets: [] }), first);
  const b = harness(() => useOptimisticMutation({ mutationFn: async () => R.ok(2), targets: [] }), second);
  const unfinished = a.result.mutateAsync(undefined);
  await flushPromises();
  await expect(b.result.mutateAsync(undefined)).resolves.toEqual(R.ok(2));
  prefetchProps({ key: ['scope'], queryFn: async () => R.ok('a') }, first).onFocus();
  prefetchProps({ key: ['scope'], queryFn: async () => R.ok('b') }, second).onFocus();
  await flushPromises();
  expect(first.getQueryData(['scope'])).toBe('a');
  expect(second.getQueryData(['scope'])).toBe('b');
  pending.resolve(R.ok(1));
  await unfinished;
});
it('reacts to query keys and page changes without freezing payload refs', async () => {
  const key = ref(1);
  const page = ref(0);
  const { result } = harness(() => ({
    query: useAppQuery({ key: () => ['key', key.value], queryFn: async () => R.ok(key.value) }),
    paged: useAppPaginatedQuery({ key: ['pages'], page, queryFn: async ({ page }) => R.ok([page]) }),
  }));
  await flushPromises();
  expect(result.query.data.value).toBe(1);
  expect(result.paged.items.value).toEqual([0]);
  key.value = 2;
  page.value = 1;
  await nextTick();
  await flushPromises();
  expect(result.query.data.value).toBe(2);
  expect(result.paged.items.value).toEqual([1]);
});
it('reset or disposal prevents a late lazy query from rewriting local state', async () => {
  const pending = deferred<Result<number, ApiFailure>>();
  const host = harness(() => useAppLazyQuery({ key: ['late'], queryFn: () => pending.promise }));
  const requested = host.result.fetch();
  host.result.reset();
  pending.resolve(R.ok(1));
  await requested;
  expect(host.result.data.value).toBeUndefined();
  expect(host.result.loading.value).toBe(false);
});
