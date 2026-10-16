import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { NavItem } from '@src/presentation/nav';

describe('nav — NavItem aria-current', () => {
  it('marks the active item as the current page', () => {
    const wrapper = mount(NavItem, {
      props: { isActive: true },
      slots: { default: () => 'Dashboard' },
    });

    expect(wrapper.attributes('aria-current')).toBe('page');
    wrapper.unmount();
  });

  it('leaves aria-current off an inactive item', () => {
    const wrapper = mount(NavItem, {
      props: { isActive: false },
      slots: { default: () => 'Settings' },
    });

    expect(wrapper.attributes('aria-current')).toBeUndefined();
    wrapper.unmount();
  });

  /*
   * `isActive` is declared with an explicit `undefined` default so an absent optional boolean
   * stays absent rather than being cast to `false`. Absent and explicitly-false are the same
   * rendering here, but they are not the same state, and the default is what keeps them apart.
   */
  it('leaves aria-current off when isActive is not passed at all', () => {
    const wrapper = mount(NavItem, { slots: { default: () => 'Reports' } });

    expect(wrapper.attributes('aria-current')).toBeUndefined();
    wrapper.unmount();
  });
});
