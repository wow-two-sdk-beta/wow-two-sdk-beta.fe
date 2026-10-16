import { describe, expect, it } from 'vitest';
import { compareStrings } from '@src/foundation/i18n';

describe('compareStrings', () => {
  /* The one cached, numeric-aware collator — the reason no sibling slice ships a comparator. */
  it('orders embedded numbers numerically, not lexically', () => {
    expect(['item10', 'item2'].sort(compareStrings)).toEqual(['item2', 'item10']);
  });
});
