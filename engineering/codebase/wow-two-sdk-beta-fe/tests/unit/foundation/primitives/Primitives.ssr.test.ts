import { describe, it } from 'vitest';
import { primitivesCases } from './PrimitivesCases';
import { assertRendersOnServer } from '../../../support/Smoke';

/*
 * SSR tier: runs in the `ssr` project, which has no DOM globals. Primitives are where the
 * browser-only APIs live — `document`, `ResizeObserver`, focus, scroll locking — so this is the
 * tier most likely to catch one of them being touched at setup rather than on mount.
 */
describe('foundation/primitives — server render', () => {
  for (const testCase of primitivesCases) {
    if (testCase.skipSsr !== undefined) {
      it.skip(`${testCase.name} server-renders — ${testCase.skipSsr}`, () => undefined);
      continue;
    }

    it(`${testCase.name} server-renders`, async () => {
      await assertRendersOnServer(testCase);
    });
  }
});
