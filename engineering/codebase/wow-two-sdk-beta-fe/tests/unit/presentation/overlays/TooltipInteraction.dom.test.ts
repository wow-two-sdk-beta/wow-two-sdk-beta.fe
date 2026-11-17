import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Tooltip } from '@src/presentation/overlays';

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  document.body.innerHTML = '';
});

it('keeps the original open delay and stays open until hover and focus both leave', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  wrapper = mount(Tooltip, {
    props: { content: 'Filter options', openDelay: 150 },
    slots: { default: '<button aria-describedby="help">Filter</button>' },
    attachTo: document.body,
  });
  const trigger = wrapper.get('button');

  await trigger.trigger('pointerenter');
  await vi.advanceTimersByTimeAsync(100);
  await trigger.trigger('focus');
  await vi.advanceTimersByTimeAsync(50);
  const tooltip = document.querySelector('[role=tooltip]');
  expect(tooltip?.textContent).toBe('Filter options');
  expect(trigger.attributes('aria-describedby')).toBe(`help ${tooltip?.id}`);

  await trigger.trigger('pointerleave');
  await vi.advanceTimersByTimeAsync(1);
  expect(document.querySelector('[role=tooltip]')).toBe(tooltip);

  await trigger.trigger('blur');
  await vi.advanceTimersByTimeAsync(1);
  expect(document.querySelector('[role=tooltip]')).toBeNull();
  expect(trigger.attributes('aria-describedby')).toBe('help');
  expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
});
