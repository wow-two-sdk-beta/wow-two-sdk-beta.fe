import { describe, it } from 'vitest';
import { overlaysCases } from './OverlaysCases';
import { assertRendersOnServer } from '../../../support/Smoke';

/*
 * SSR tier: runs in the `ssr` project, which has no DOM globals. A component that touches
 * `window` / `document` at setup — or from an `immediate: true` watcher, which Vue runs on
 * the server — throws here and only here.
 */
describe('presentation/overlays — server render', () => {
  for (const testCase of overlaysCases) {
    if (testCase.skipSsr !== undefined) {
      it.skip(`${testCase.name} server-renders — ${testCase.skipSsr}`, () => undefined);
      continue;
    }

    it(`${testCase.name} server-renders`, async () => {
      await assertRendersOnServer(testCase);
    });
  }
});
