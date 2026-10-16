import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { MasonryLayout } from '@src/presentation/layout';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

it('balances children into columns and repeats the gap under each item', () => {
  const wrapper = mount(MasonryLayout, {
    props: { columns: 4, minColumnWidth: '16rem', gap: '12px' },
    slots: { default: () => [h('div', 'a'), h('div', 'b')] },
  });
  wrappers.push(wrapper);
  const style = wrapper.attributes('style') ?? '';
  expect(style).toContain('columns: 16rem 4');
  expect(style).toContain('--masonry-gap: 12px');
  expect(wrapper.attributes('data-columns')).toBe('4');
  expect(wrapper.classes()).toEqual(expect.arrayContaining(['*:break-inside-avoid', '*:mb-(--masonry-gap)']));
});

it('keeps at least one column for an invalid count', () => {
  const wrapper = mount(MasonryLayout, { props: { columns: Number.NaN }, slots: { default: () => 'x' } });
  wrappers.push(wrapper);
  expect(wrapper.attributes('data-columns')).toBe('3');
  const zero = mount(MasonryLayout, { props: { columns: 0 }, slots: { default: () => 'x' } });
  wrappers.push(zero);
  expect(zero.attributes('data-columns')).toBe('1');
});
