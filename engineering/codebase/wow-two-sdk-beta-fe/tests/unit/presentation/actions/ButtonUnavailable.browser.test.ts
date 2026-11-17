import { nativeTab } from '../../../BrowserKeyboard';
import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { h } from 'vue';
import { userEvent } from 'vitest/browser';
import Button from '@src/presentation/actions/button/Button.vue';
import '@src/index.css';

const Reason = 'No link to the original';

it('reaches an unavailable glass icon button with Tab and swallows Enter and Space', async () => {
  const onClick = vi.fn();
  const onPressStart = vi.fn();
  const wrapper = mount(Button, {
    attachTo: document.body,
    props: { variant: 'glass', shape: 'circle', isUnavailable: true, unavailableLabel: Reason },
    attrs: { 'aria-label': 'Open the original', onClick, onPressStart },
    slots: { default: () => h('svg', { width: 15, height: 15, 'aria-hidden': 'true' }) },
  });
  try {
    const button = wrapper.get('button').element;
    await nativeTab();
    expect(document.activeElement).toBe(button);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await userEvent.click(button, { force: true });
    expect(onClick).not.toHaveBeenCalled();
    expect(onPressStart).not.toHaveBeenCalled();
  } finally {
    wrapper.unmount();
  }
});

it('draws a dashed, dimmed circle with a slash over the icon', () => {
  const wrapper = mount(Button, {
    attachTo: document.body,
    props: { variant: 'glass', shape: 'circle', isUnavailable: true, unavailableLabel: Reason },
    attrs: { 'aria-label': 'Open the original' },
    slots: { default: () => h('svg', { width: 15, height: 15, 'aria-hidden': 'true' }) },
  });
  try {
    const button = wrapper.get('button').element;
    const style = getComputedStyle(button);
    expect(style.borderTopStyle).toBe('dashed');
    expect(Number.parseFloat(style.opacity)).toBeCloseTo(0.6);
    expect(style.position).toBe('relative');
    const slash = getComputedStyle(button, '::after');
    expect(slash.position).toBe('absolute');
    expect(slash.rotate).toBe('45deg');
    expect(slash.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    const description = document.getElementById(button.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toBe(Reason);
    expect(description?.getClientRects()).toHaveLength(0);
  } finally {
    wrapper.unmount();
  }
});

it('keeps a slotted unavailable link from navigating on Enter', async () => {
  const before = location.href;
  const wrapper = mount(Button, {
    attachTo: document.body,
    props: { asChild: true, shape: 'circle', isUnavailable: true, unavailableLabel: Reason },
    slots: { default: () => h('a', { href: '#navigated', 'aria-label': 'Open the original' }, '↗') },
  });
  try {
    const link = wrapper.get('a').element;
    link.focus();
    await userEvent.keyboard('{Enter}');
    expect(location.href).toBe(before);
  } finally {
    wrapper.unmount();
  }
});
