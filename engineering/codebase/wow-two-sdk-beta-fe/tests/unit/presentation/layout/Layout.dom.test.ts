import { describe, it } from 'vitest';
import { layoutCases } from './LayoutCases';
import { assertMounts, assertRendersDefaultSlot } from '../../../support/Smoke';

/*
 * Breadth tier: every `presentation/layout` export mounts on happy-dom without throwing or
 * warning fatally, and the ones with an unconditional default slot render what is put in it.
 * Depth belongs in the focused files beside this one.
 */
describe('presentation/layout — mounts', () => {
  for (const testCase of layoutCases) {
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
