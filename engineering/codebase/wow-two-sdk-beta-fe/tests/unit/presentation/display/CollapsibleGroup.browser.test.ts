import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { CollapsibleGroup, CollapsibleGroupContent, CollapsibleGroupTrigger } from '@src/presentation/display';
import '@src/index.css';

it('keeps the closing panel mounted and inert until its height settles', async () => {
  const wrapper = mount(CollapsibleGroup, {
    attrs: { style: { '--duration-base': '500ms' } },
    slots: {
      default: () => [
        h(CollapsibleGroupTrigger, null, () => 'Details'),
        h(CollapsibleGroupContent, null, () => h('button', { style: { display: 'block', height: '100px' } }, 'Action')),
      ],
    },
    attachTo: document.body,
  });
  const toggle = wrapper.get<HTMLButtonElement>('button[aria-controls]');
  const contentId = toggle.attributes('aria-controls')!;
  const content = () => document.getElementById(contentId);

  try {
    expect(content()).toBeNull();
    await toggle.trigger('click');
    await expect.poll(() => content()?.getBoundingClientRect().height).toBe(100);

    toggle.element.click();
    await nextTick();
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(content()?.inert).toBe(true);
    await expect
      .poll(() => {
        const height = content()?.getBoundingClientRect().height ?? 0;
        return height > 0 && height < 100;
      })
      .toBe(true);
    await expect.poll(content).toBeNull();
  } finally {
    wrapper.unmount();
  }
});
