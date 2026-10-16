import { afterEach, expect, it } from 'vitest';
import { createTestQueryClient } from '@src/query/adapters/tanstack/QueryTestUtils';
import { setupQueryPersistence } from '@src/query/adapters/tanstack/Persistence';
afterEach(() => {
  localStorage.clear();
});
it('persists and restores only explicit identity-scoped keys', async () => {
  const source = createTestQueryClient();
  const handle = setupQueryPersistence(source, { includes: (key) => key[0] === 'public' });
  source.setQueryData(['public'], 1);
  source.setQueryData(['private-user-a'], 'secret');
  await new Promise((resolve) => setTimeout(resolve, 1100));
  handle?.unsubscribe();
  const snapshot = JSON.parse(localStorage.getItem('app:query-cache')!);
  expect(snapshot.state.queries).toHaveLength(1);
  expect(JSON.stringify(snapshot)).not.toContain('secret');
  const target = createTestQueryClient();
  const restored = setupQueryPersistence(target, { includes: () => false });
  expect(target.getQueryData(['public'])).toBeUndefined();
  restored?.unsubscribe();
  source.clear();
  target.clear();
});
it('discards malformed or future timestamp snapshots before hydration', () => {
  const client = createTestQueryClient();
  localStorage.setItem(
    'app:query-cache',
    JSON.stringify({ buster: '', timestamp: Date.now() + 100000, state: { queries: [] } }),
  );
  setupQueryPersistence(client, { includes: () => true })?.unsubscribe();
  expect(localStorage.getItem('app:query-cache')).toBeNull();
  client.clear();
});
