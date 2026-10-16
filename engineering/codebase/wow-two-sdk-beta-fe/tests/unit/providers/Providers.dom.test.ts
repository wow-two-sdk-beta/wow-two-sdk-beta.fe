import { describe, it } from 'vitest';
import { providersCases } from './ProvidersCases';
import { assertMounts, assertRendersDefaultSlot } from '../../support/Smoke';

/* Breadth tier for the module-level providers — see `ProvidersCases.ts` for why they get one. */
describe('providers — mounts', () => {
  for (const testCase of providersCases) {
    if (testCase.skipMount !== undefined) {
      it.skip(`${testCase.name} mounts — ${testCase.skipMount}`, () => undefined);
      continue;
    }

    it(`${testCase.name} mounts`, async () => {
      await assertMounts(testCase);
    });

    if (testCase.slot === true) {
      it(`${testCase.name} renders its default slot`, async () => {
        await assertRendersDefaultSlot(testCase);
      });
    }
  }
});
