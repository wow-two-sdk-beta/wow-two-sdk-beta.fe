import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { Card } from '@src/presentation/display';

describe('Card ambient treatments', () => {
  it.each([
    ['sheen', 'surface-sheen'],
    ['glow', 'surface-glow'],
    ['bevel', 'surface-bevel'],
  ] as const)('maps %s to its package stylesheet class', (ambient, className) => {
    expect(mount(Card, { props: { ambient }, slots: { default: 'Card' } }).classes()).toContain(className);
  });
});
