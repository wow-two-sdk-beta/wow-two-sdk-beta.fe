import { expect, it, vi } from 'vitest';
import { createQueryClient } from '@src/query/adapters/tanstack/CreateQueryClient';
import { queryOutcome, resolveQueryResult } from '@src/query/adapters/tanstack/QueryOutcome';
import { ApiFailureFactory } from '@src/foundation/http';
import { ResultExtensions as R } from '@src/foundation/results';
it('preserves HTTP failure identity across vendor rejection and retries neither validation nor cancellation', async () => {
  const onError = vi.fn();
  const client = createQueryClient({ onError });
  for (const code of ['validation', 'cancelled'] as const) {
    const failure = ApiFailureFactory.create(code);
    const queryFn = vi.fn(() => resolveQueryResult(Promise.resolve(R.fail(failure))));
    expect(await queryOutcome(() => client.fetchQuery({ queryKey: [code], queryFn }))).toEqual(R.fail(failure));
    expect(queryFn).toHaveBeenCalledOnce();
  }
  expect(onError).toHaveBeenCalledOnce();
  client.clear();
});
it('never turns programmer exceptions into an expected operation result', async () => {
  await expect(
    queryOutcome(async () => {
      throw new Error('programmer bug');
    }),
  ).rejects.toThrow('programmer bug');
});
