import type { QueryClient } from '@tanstack/vue-query';

const tails = new WeakMap<QueryClient, Promise<void>>();

/** Serializes optimistic cache transactions per client so rollback never erases a later write. */
export async function runOptimisticTransaction<T>(client: QueryClient, run: () => Promise<T>): Promise<T> {
  const previous = tails.get(client) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  tails.set(client, current);
  await previous;
  try {
    return await run();
  } finally {
    release();
    if (tails.get(client) === current) tails.delete(client);
  }
}
