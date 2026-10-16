import { describe, it } from 'vitest';
import { primitivesCases } from './PrimitivesCases';
import { assertMounts, assertRendersDefaultSlot } from '../../../support/Smoke';

/* Breadth tier for the L2 headless layer — see `PrimitivesCases.ts` for why it gets its own. */
describe('foundation/primitives — mounts', () => {
  for (const testCase of primitivesCases) {
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
