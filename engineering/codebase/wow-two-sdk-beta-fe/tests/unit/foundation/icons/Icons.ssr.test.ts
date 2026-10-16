import { describe, it } from 'vitest';
import { iconsCases } from './IconsCases';
import { assertRendersOnServer } from '../../../support/Smoke';

describe('foundation/icons — server render', () => {
  for (const testCase of iconsCases) {
    it(`${testCase.name} server-renders`, async () => {
      await assertRendersOnServer(testCase);
    });
  }
});
