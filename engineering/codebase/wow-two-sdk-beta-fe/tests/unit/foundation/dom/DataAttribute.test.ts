import { describe, expect, it } from 'vitest';
import { dataAttr } from '@src/foundation/dom';

describe('dataAttr', () => {
  /*
   * The whole point: `true` becomes the empty string so the attribute RENDERS bare
   * (`data-disabled`), and `false` becomes `undefined` so Vue omits it. Returning `'false'`
   * would leave every `[data-disabled]` selector matching an enabled control.
   */
  it('renders a present flag bare and omits an absent one', () => {
    expect(dataAttr(true)).toBe('');
    expect(dataAttr(false)).toBeUndefined();
    expect(dataAttr(undefined)).toBeUndefined();
  });
});
