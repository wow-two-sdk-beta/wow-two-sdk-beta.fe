import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, type Component } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { OverflowGroup } from '@src/presentation/display';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

const tags = ['vue', 'tailwind', 'temporal', 'vitest', 'pnpm'];

function mountGroup(props: Record<string, unknown>, slots: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(OverflowGroup as unknown as Component, {
    props: { items: tags, ...props },
    slots: { default: ({ item }: { item: string }) => h('span', { 'data-tag': '' }, item), ...slots },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('OverflowGroup', () => {
  it('shows the first items and one marker that names what it counts', () => {
    const wrapper = mountGroup({ max: 2 });
    expect(wrapper.findAll('[data-tag]').map((node) => node.text())).toEqual(['vue', 'tailwind']);
    const marker = wrapper.get('[data-overflow-marker]');
    expect(marker.text()).toBe('+3');
    expect(marker.attributes('aria-label')).toBe('3 more');
  });

  it('draws no marker when everything fits and hands the hidden items to a custom marker', () => {
    expect(mountGroup({ max: 9 }).find('[data-overflow-marker]').exists()).toBe(false);
    const custom = mountGroup(
      { max: 4 },
      { overflow: ({ hidden }: { hidden: string[] }) => h('em', { 'data-custom': '' }, hidden.join(',')) },
    );
    expect(custom.get('[data-custom]').text()).toBe('pnpm');
  });

  it('localizes the marker text and name', () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(
            LocaleProvider,
            {
              messages: {
                'OverflowGroup.overflowLabel': '+{count} weitere',
                'OverflowGroup.hiddenItems': '{count} mehr',
              },
            },
            () => h(OverflowGroup as unknown as Component, { items: tags, max: 1 }, { default: () => h('span') }),
          ),
      }),
    );
    wrappers.push(wrapper);
    const marker = wrapper.get('[data-overflow-marker]');
    expect(marker.text()).toBe('+4 weitere');
    expect(marker.attributes('aria-label')).toBe('4 mehr');
  });
});

it('fills the count into a caller marker text', () => {
  const wrapper = mount(OverflowGroup as unknown as Component, {
    props: { items: tags, max: 3, overflowLabel: 'and {count} others' },
    slots: { default: () => h('span') },
  });
  wrappers.push(wrapper);
  expect(wrapper.get('[data-overflow-marker]').text()).toBe('and 2 others');
});
