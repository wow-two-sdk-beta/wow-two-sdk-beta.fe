import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import {
  createQueryClient,
  setupQueryPersistence,
  useAppMutation,
  useOptimisticMutation,
  useAppQuery,
  useAppPaginatedQuery,
} from '@src/query';
import { runWithQuery } from '@src/query/adapters/tanstack/QueryTestUtils';
import { createRequestScope, ApiFailureFactory, type ApiFailure } from '@src/foundation/http';
import { ResultExtensions as R, type Result } from '@src/foundation/results';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}
const cleanup: Array<() => void> = [];
afterEach(() => {
  vi.useRealTimers();
  cleanup
    .splice(0)
    .reverse()
    .forEach((fn) => fn());
  localStorage.clear();
});
function harness<T>(setup: () => T, client = createQueryClient()) {
  const host = runWithQuery(setup, client);
  cleanup.push(() => {
    host.unmount();
    client.dispose();
  });
  return { ...host, client };
}

describe('query session boundaries', () => {
  it('does not revive a disposed owner scope through a session invalidation', async () => {
    const scope = createRequestScope();
    const client = createQueryClient({ scope });
    const mutate = vi.fn(async () => R.ok('value'));
    const host = harness(() => useAppMutation({ mutationFn: mutate }), client);
    scope.dispose();
    client.invalidateSession();
    expect(await host.result.mutateAsync(undefined)).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    expect(mutate).not.toHaveBeenCalled();
  });

  it('drops late passive confirmations and resets mutation data without cancelling other clients', async () => {
    const scope = createRequestScope();
    const client = createQueryClient({ scope });
    const pending = deferred<Result<string, ApiFailure>>();
    const confirmed = vi.fn((value: string) => client.setQueryData(['private'], value));
    const host = harness(() => useAppMutation({ mutationFn: () => pending.promise, onConfirmed: confirmed }), client);
    const old = host.result.mutateAsync(undefined);
    await flushPromises();
    scope.invalidate();
    client.setQueryData(['private'], 'bob');
    pending.resolve(R.ok('alice'));
    expect(await old).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    expect(confirmed).not.toHaveBeenCalled();
    expect(client.getQueryData(['private'])).toBe('bob');
    expect(host.result.data.value).toBeUndefined();
  });

  it('prevents stale optimistic rollback and skips queued work from the old session', async () => {
    const client = createQueryClient();
    client.setQueryData(['count'], 1);
    const pending = deferred<Result<number, ApiFailure>>();
    const mutate = vi.fn((value: number) => (value === 2 ? pending.promise : Promise.resolve(R.ok(value))));
    const host = harness(
      () =>
        useOptimisticMutation({
          mutationFn: mutate,
          invalidateOnSettle: false,
          targets: [{ key: ['count'], apply: (_old, value: number) => value }],
        }),
      client,
    );
    const first = host.result.mutateAsync(2);
    await flushPromises();
    const queued = host.result.mutateAsync(3);
    await flushPromises();
    expect(client.getQueryData(['count'])).toBe(2);
    client.invalidateSession();
    client.setQueryData(['count'], 100);
    expect(await first).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    expect(await queued).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    pending.resolve(R.fail(ApiFailureFactory.create('http')));
    await flushPromises();
    expect(client.getQueryData(['count'])).toBe(100);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(await host.result.mutateAsync(4)).toEqual(R.ok(4));
    expect(client.getQueryData(['count'])).toBe(4);
  });

  it('removes persisted private data and stops the old writer on identity invalidation', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const client = createQueryClient();
    cleanup.push(client.dispose);
    const handle = setupQueryPersistence(client, { includes: () => true })!;
    cleanup.push(handle.unsubscribe);
    client.setQueryData(['private'], 'alice');
    await vi.advanceTimersByTimeAsync(1000);
    expect(localStorage.getItem('app:query-cache')).toContain('alice');
    client.invalidateSession();
    expect(localStorage.getItem('app:query-cache')).toBeNull();
    client.setQueryData(['private'], 'bob');
    await vi.advanceTimersByTimeAsync(1000);
    expect(localStorage.getItem('app:query-cache')).toBeNull();
    const next = setupQueryPersistence(client, { includes: () => true });
    cleanup.push(next!.unsubscribe);
    client.setQueryData(['private'], 'bob-new');
    await vi.advanceTimersByTimeAsync(1000);
    expect(localStorage.getItem('app:query-cache')).toContain('bob-new');
    handle.clear();
    expect(localStorage.getItem('app:query-cache')).toContain('bob-new');
  });

  it('rebinds live observers without showing old paginated placeholder data across identities', async () => {
    const client = createQueryClient();
    let current = 'alice';
    const next = deferred<Result<string[], ApiFailure>>();
    const host = harness(
      () => ({
        query: useAppQuery({ key: ['me'], queryFn: async () => R.ok(current) }),
        page: useAppPaginatedQuery({
          key: ['pages'],
          page: 1,
          queryFn: () => (current === 'alice' ? Promise.resolve(R.ok(['alice'])) : next.promise),
        }),
      }),
      client,
    );
    await flushPromises();
    expect(host.result.query.data.value).toBe('alice');
    expect(host.result.page.items.value).toEqual(['alice']);
    current = 'bob';
    client.invalidateSession();
    await flushPromises();
    expect(host.result.query.data.value).toBe('bob');
    expect(host.result.page.items.value).toEqual([]);
    next.resolve(R.ok(['bob']));
    await flushPromises();
    expect(host.result.page.items.value).toEqual(['bob']);
  });

  it('releases the shared auth subscription on client disposal while preserving other clients', () => {
    const scope = createRequestScope();
    const a = createQueryClient({ scope });
    const b = createQueryClient();
    cleanup.push(b.dispose);
    a.setQueryData(['a'], 1);
    b.setQueryData(['b'], 2);
    a.dispose();
    expect(a.getQueryData(['a'])).toBeUndefined();
    expect(b.getQueryData(['b'])).toBe(2);
    expect(scope.capture().isCurrent()).toBe(true);
    scope.invalidate();
    expect(b.getQueryData(['b'])).toBe(2);
  });
});
