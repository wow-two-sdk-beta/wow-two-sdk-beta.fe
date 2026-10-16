import { describe, expect, it } from 'vitest';
import { cn } from '@src/foundation/styles';

describe('cn', () => {
  it('resolves a tailwind conflict last-wins rather than concatenating', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('drops falsy class values', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2');
  });
});
