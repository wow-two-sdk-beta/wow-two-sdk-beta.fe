import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import Button from '@src/presentation/actions/button/Button.vue';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

function render(props: Record<string, unknown>, slots: Record<string, () => unknown>) {
  const wrapper = mount(Button, { props, slots });
  wrappers.push(wrapper);
  return wrapper;
}

describe('button loading keeps its shape', () => {
  it('swaps the leading icon for the spinner and keeps the label', () => {
    const wrapper = render(
      { isLoading: true },
      { leading: () => h('svg', { class: 'refresh-icon' }), default: () => 'Refresh' },
    );
    expect(wrapper.find('.refresh-icon').exists()).toBe(false);
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true);
    expect(wrapper.text()).toBe('Refresh');
    expect(wrapper.find('.sr-only').exists()).toBe(false);
    expect(wrapper.get('button').attributes('data-state')).toBe('loading');
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true');
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined();
  });
  it('restores the leading icon when loading ends', async () => {
    const wrapper = render(
      { isLoading: true },
      { leading: () => h('svg', { class: 'refresh-icon' }), default: () => 'Refresh' },
    );
    await wrapper.setProps({ isLoading: false });
    expect(wrapper.find('.refresh-icon').exists()).toBe(true);
    expect(wrapper.find('svg.animate-spin').exists()).toBe(false);
    expect(wrapper.get('button').attributes('data-state')).toBeUndefined();
  });
  it('centers the spinner over a transparent label when there is no icon to swap', () => {
    const wrapper = render({ isLoading: true }, { default: () => 'Save changes' });
    const label = wrapper.get('.opacity-0');
    expect(label.text()).toBe('Save changes');
    expect(wrapper.find('.absolute svg.animate-spin').exists()).toBe(true);
  });
  it('replaces the label only when loading text is given', () => {
    const wrapper = render(
      { isLoading: true, loadingText: 'Refreshing' },
      { leading: () => h('svg', { class: 'refresh-icon' }), default: () => 'Refresh' },
    );
    expect(wrapper.text()).toBe('Refreshing');
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true);
  });
  it('keeps a trailing icon while loading', () => {
    const wrapper = render(
      { isLoading: true },
      {
        leading: () => h('svg', { class: 'lead' }),
        default: () => 'Deploy',
        trailing: () => h('svg', { class: 'chevron' }),
      },
    );
    expect(wrapper.find('.chevron').exists()).toBe(true);
    expect(wrapper.find('.lead').exists()).toBe(false);
  });
});
