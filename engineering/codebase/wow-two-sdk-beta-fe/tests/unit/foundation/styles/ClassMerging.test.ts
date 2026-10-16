import { describe, expect, it } from 'vitest';
import { cn, tv } from '@src/foundation/styles';

describe('shared class merging', () => {
  it('keeps caller wins for nested conditional classes and responsive conflicts', () => {
    expect(cn('px-2 md:px-4', [false, { 'px-6': true }], 'md:px-8')).toBe('px-6 md:px-8');
    expect(cn(null, undefined, false)).toBe('');
  });

  it('retains variant extension and slot conflict resolution', () => {
    const base = tv({ slots: { base: 'p-2', label: 'text-sm' }, variants: { active: { true: { base: 'p-4' } } } });
    const extended = tv({ extend: base, slots: { label: 'text-lg' } });
    const parts = extended({ active: true });
    expect(parts.base({ class: 'p-6' })).toBe('p-6');
    expect(parts.label()).toBe('text-lg');
    expect(cn(parts.base(), 'p-8')).toBe('p-8');
  });
});
