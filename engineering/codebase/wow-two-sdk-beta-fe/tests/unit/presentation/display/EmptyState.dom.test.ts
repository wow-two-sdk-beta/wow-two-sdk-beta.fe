import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyState from '@src/presentation/display/emptyState/EmptyState.vue';

describe('empty collection label', () => {
  it('renders plain centered copy without adding a card, heading, or action', () => {
    const wrapper = mount(EmptyState, { props: { title: 'No collections yet.' } });
    expect(wrapper.text()).toBe('No collections yet.');
    expect(wrapper.classes()).toContain('text-center');
    expect(wrapper.classes()).toContain('items-center');
    expect(wrapper.classes().some((name) => /^(border|bg-|shadow)/.test(name))).toBe(false);
    expect(wrapper.find('h3').exists()).toBe(false);
    expect(wrapper.find('button').exists()).toBe(false);
    wrapper.unmount();
  });
});
