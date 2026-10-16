import { nativeTab } from '../../../BrowserKeyboard';
import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { h } from 'vue';
import { userEvent } from 'vitest/browser';
import Button from '@src/presentation/actions/button/Button.vue';
import '@src/index.css';

it('keeps keyboard focus visible when forced colors removes ring shadows', async () => {
  const wrapper = mount(Button, { attachTo: document.body, slots: { default: 'Continue' } });
  try {
    const button = wrapper.get('button').element;
    await nativeTab();
    expect(document.activeElement).toBe(button);
    const style = getComputedStyle(button);
    if (matchMedia('(forced-colors: active)').matches) {
      expect(style.boxShadow).toBe('none');
      expect(style.outlineStyle).not.toBe('none');
      expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
      expect(style.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
    } else {
      expect(style.boxShadow).not.toBe('none');
    }
  } finally {
    wrapper.unmount();
  }
});

it.each(['isDisabled', 'isLoading', 'isSkeleton'] as const)(
  'blocks slotted native activation during %s',
  async (state) => {
    const action = vi.fn();
    const wrapper = mount(Button, {
      attachTo: document.body,
      props: { asChild: true, [state]: true },
      slots: { default: () => h('a', { href: '#blocked-action', onClick: action }, 'Open') },
    });
    try {
      const link = wrapper.get('a').element;
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(action).not.toHaveBeenCalled();
      expect(link.getAttribute('aria-disabled')).toBe('true');
      link.focus();
      await userEvent.keyboard('{Enter}');
      expect(action).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  },
);
