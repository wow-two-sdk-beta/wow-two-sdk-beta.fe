import { describe, it } from 'vitest';
import { providersCases } from './ProvidersCases';
import { assertRendersOnServer } from '../../support/Smoke';

/*
 * SSR tier: a provider is the root of a consuming app's tree, so one that reaches for a browser
 * global at setup takes every route under it down rather than one component.
 */
describe('providers — server render', () => {
  for (const testCase of providersCases) {
    if (testCase.skipSsr !== undefined) {
      it.skip(`${testCase.name} server-renders — ${testCase.skipSsr}`, () => undefined);
      continue;
    }

    it(`${testCase.name} server-renders`, async () => {
      await assertRendersOnServer(testCase);
    });
  }
});
