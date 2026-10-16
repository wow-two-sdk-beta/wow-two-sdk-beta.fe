import { expect, it } from 'vitest';
import { AppErrorFactory, ResultExtensions as R } from '@src/foundation/results';
it('maps success and preserves the exact failure without running the success mapper', () => {
  const failure = R.fail(AppErrorFactory.validation());
  expect(R.map(R.ok(3), (x) => x * 2)).toEqual(R.ok(6));
  expect(
    R.map(failure, () => {
      throw new Error('wrong branch');
    }),
  ).toBe(failure);
});
it('adapts only classified exceptions and leaves programmer bugs exceptional', async () => {
  const expected = new Error('expected');
  const classify = (error: unknown) => (error === expected ? AppErrorFactory.unavailable() : undefined);
  expect(
    R.fromThrowing(() => {
      throw expected;
    }, classify),
  ).toMatchObject({ ok: false });
  await expect(
    R.fromPromise(async () => {
      throw new TypeError('bug');
    }, classify),
  ).rejects.toThrow('bug');
});
