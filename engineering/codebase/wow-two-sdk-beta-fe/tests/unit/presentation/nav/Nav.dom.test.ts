import { describe, it } from 'vitest';
import { navCases } from './NavCases';
import { assertMounts, assertRendersDefaultSlot } from '../../../support/Smoke';

/*
 * Breadth tier: every `presentation/nav` export mounts on happy-dom without throwing or
 * warning fatally, and the ones with an unconditional default slot render what is put in it.
 * Depth belongs in the focused files beside this one.
 */
describe('presentation/nav — mounts', () => {
  for (const testCase of navCases) {
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
