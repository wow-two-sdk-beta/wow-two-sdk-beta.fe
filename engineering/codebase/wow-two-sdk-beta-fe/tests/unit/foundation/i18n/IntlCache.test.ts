import { describe, expect, it } from 'vitest';
import { createCollator, createLocaleFormatters } from '@src/foundation/i18n';

describe('Intl cache lifetime', () => {
  it('reuses equivalent options regardless of object key order', () => {
    const first = createCollator('en-US', { numeric: false, sensitivity: 'base' });
    expect(createCollator('en-US', { sensitivity: 'base', numeric: false })).toBe(first);
  });

  it('evicts old entries while existing formatter users keep working', () => {
    const first = createCollator('en-US-x-old');
    const formatter = createLocaleFormatters('en-US-x-old');
    const number = formatter.number(1234);
    for (let index = 0; index < 300; index += 1) createCollator(`en-US-x-${index}`);
    expect(createCollator('en-US-x-old')).not.toBe(first);
    expect(first.compare('item 2', 'item 10')).toBeLessThan(0);
    expect(formatter.number(1234)).toBe(number);
  });
});
