import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Breadcrumb } from '@src/presentation/nav';

const Items = [
  { label: 'Home', href: '/' },
  { label: 'Operations', href: '/ops' },
  { label: 'Deployments', href: '/ops/deployments' },
  { label: 'Release 42' },
];

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

function render(props: Record<string, unknown>): VueWrapper {
  wrapper = mount(Breadcrumb, { props: { items: Items, ...props } });
  return wrapper;
}

describe('Breadcrumb isSingleLine', () => {
  it('keeps the list on one line', () => {
    const list = render({ isSingleLine: true }).get('ol');
    expect(list.classes()).toContain('flex-nowrap');
    expect(list.classes()).not.toContain('flex-wrap');
  });

  it('truncates items and emphasises the last', () => {
    const items = render({ isSingleLine: true }).findAll('li:not([aria-hidden])');
    expect(items).toHaveLength(4);
    for (const item of items) expect(item.classes()).toContain('truncate');
    expect(items[3]!.classes()).toContain('font-semibold');
    expect(items[2]!.classes()).not.toContain('font-semibold');
  });

  it('hides items before the last two, and their separators, below md', () => {
    const wrapper = render({ isSingleLine: true });
    const items = wrapper.findAll('li:not([aria-hidden])');
    const separators = wrapper.findAll('li[aria-hidden]');
    expect(separators).toHaveLength(3);
    expect(items.map((item) => item.classes().includes('max-md:hidden'))).toEqual([true, true, false, false]);
    expect(separators.map((item) => item.classes().includes('max-md:hidden'))).toEqual([true, true, false]);
  });

  it('wraps by default', () => {
    const wrapper = render({});
    const list = wrapper.get('ol');
    expect(list.classes()).toContain('flex-wrap');
    expect(list.classes()).not.toContain('flex-nowrap');
    expect(wrapper.findAll('li').some((item) => item.classes().includes('truncate'))).toBe(false);
  });
});
