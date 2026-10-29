import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { Card, CardLink } from '@src/presentation/display';

describe('Card ambient treatments', () => {
  it.each([
    ['sheen', 'surface-sheen'],
    ['glow', 'surface-glow'],
    ['bevel', 'surface-bevel'],
  ] as const)('maps %s to its package stylesheet class', (ambient, className) => {
    expect(mount(Card, { props: { ambient }, slots: { default: 'Card' } }).classes()).toContain(className);
  });
});

describe('CardLink', () => {
  it('renders a named link stretched over the card that hosts it', () => {
    const wrapper = mount(Card, {
      slots: { default: () => h(CardLink, { href: '/products/shop' }, () => 'Shop') },
    });
    const link = wrapper.get('a[data-card-link]');
    expect(link.attributes('href')).toBe('/products/shop');
    expect(link.text()).toBe('Shop');
    expect(link.classes()).toEqual(expect.arrayContaining(['after:absolute', 'after:inset-0']));
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['has-[[data-card-link]]:relative', 'has-[[data-card-link]:focus-visible]:outline-ring']),
    );
  });

  it('merges onto a child link with asChild', () => {
    const wrapper = mount(CardLink, {
      props: { asChild: true },
      slots: { default: () => h('a', { href: '/x', class: 'font-semibold' }, 'X') },
    });
    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.attributes('data-card-link')).toBe('');
    expect(wrapper.attributes('href')).toBe('/x');
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['font-semibold', 'after:absolute']));
  });
});
