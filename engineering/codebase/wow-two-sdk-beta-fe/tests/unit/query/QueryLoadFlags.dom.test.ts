import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { runWithQuery, createTestQueryClient } from '@src/query/adapters/tanstack/QueryTestUtils';
import { useAppQuery } from '@src/query';
import { ResultExtensions as R, type Result } from '@src/foundation/results';
import type { ApiFailure } from '@src/foundation/http';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));

function harness(keepPreviousData: boolean) {
  const client = createTestQueryClient();
  const filter = ref('a');
  const pending = new Map<string, ReturnType<typeof deferred<Result<string[], ApiFailure>>>>();
  const host = runWithQuery(
    () =>
      useAppQuery({
        key: () => ['items', filter.value],
        queryFn: () => {
          const gate = deferred<Result<string[], ApiFailure>>();
          pending.set(filter.value, gate);
          return gate.promise;
        },
        map: (raw: string[]) => raw.map((item) => item.toUpperCase()),
        keepPreviousData,
      }),
    client,
  );
  cleanups.push(() => {
    host.unmount();
    client.clear();
  });
  return { query: host.result, filter, pending };
}

describe('useAppQuery load flags', () => {
  it('separates the first load from a refresh', async () => {
    const { query, pending } = harness(false);
    await flushPromises();
    expect(query.isFirstLoad.value).toBe(true);
    expect(query.loading.value).toBe(true);
    expect(query.isRefreshing.value).toBe(false);

    pending.get('a')!.resolve(R.ok(['x']));
    await flushPromises();
    expect(query.data.value).toEqual(['X']);
    expect(query.isFirstLoad.value).toBe(false);

    void query.refetch();
    await flushPromises();
    expect(query.isRefreshing.value).toBe(true);
    expect(query.isFirstLoad.value).toBe(false);
    pending.get('a')!.resolve(R.ok(['y']));
    await flushPromises();
    expect(query.isRefreshing.value).toBe(false);
  });

  it('drops to the first-load state on a new key by default', async () => {
    const { query, filter, pending } = harness(false);
    await flushPromises();
    pending.get('a')!.resolve(R.ok(['x']));
    await flushPromises();
    filter.value = 'b';
    await flushPromises();
    expect(query.data.value).toBeUndefined();
    expect(query.isFirstLoad.value).toBe(true);
  });

  it('keeps the previous key mapped data while a new key loads', async () => {
    const { query, filter, pending } = harness(true);
    await flushPromises();
    pending.get('a')!.resolve(R.ok(['x']));
    await flushPromises();
    filter.value = 'b';
    await flushPromises();
    expect(query.data.value).toEqual(['X']);
    expect(query.isPreviousData.value).toBe(true);
    expect(query.isFirstLoad.value).toBe(false);
    expect(query.isRefreshing.value).toBe(true);

    pending.get('b')!.resolve(R.ok(['z']));
    await flushPromises();
    expect(query.data.value).toEqual(['Z']);
    expect(query.isPreviousData.value).toBe(false);
    expect(query.isRefreshing.value).toBe(false);
  });
});
