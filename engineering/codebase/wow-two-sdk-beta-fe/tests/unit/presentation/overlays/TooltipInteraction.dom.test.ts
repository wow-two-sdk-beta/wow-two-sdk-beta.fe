import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Tooltip } from '@src/presentation/overlays';

let wrapper: VueWrapper | undefined;
let second: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  second?.unmount();
  second = undefined;
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
  expect(trigger.attributes('aria-describedby')).toBe('help');
  expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
  await vi.advanceTimersByTimeAsync(200);
  expect(document.querySelector('[role=tooltip]')).toBeNull();
});

it('keeps a tooltip dismissed with Escape closed until a new pointer enter', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  wrapper = mount(Tooltip, {
    props: { content: 'Filter options', openDelay: 150 },
    slots: { default: '<button>Filter</button>' },
    attachTo: document.body,
  });
  const trigger = wrapper.get('button');

  await trigger.trigger('pointerenter');
  await trigger.trigger('focus');
  await vi.advanceTimersByTimeAsync(150);
  expect(document.querySelector('[role=tooltip]')).not.toBeNull();

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await vi.advanceTimersByTimeAsync(200);
  expect(document.querySelector('[role=tooltip]')).toBeNull();

  await trigger.trigger('pointerleave');
  await vi.advanceTimersByTimeAsync(1000);
  expect(document.querySelector('[role=tooltip]')).toBeNull();

  await trigger.trigger('pointerenter');
  await vi.advanceTimersByTimeAsync(150);
  expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Filter options');
});

it('cancels an earlier delayed focus hint across two Vue roots in the same document', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  wrapper = mount(Tooltip, {
    props: { content: 'First hint', openDelay: 200 },
    slots: { default: '<button>First</button>' },
    attachTo: document.body,
  });
  second = mount(Tooltip, {
    props: { content: 'Second hint', openDelay: 20 },
    slots: { default: '<button>Second</button>' },
    attachTo: document.body,
  });

  wrapper.get('button').element.focus();
  await vi.advanceTimersByTimeAsync(50);
  await second.get('button').trigger('pointerenter');
  await vi.advanceTimersByTimeAsync(200);

  expect(document.activeElement).toBe(wrapper.get('button').element);
  expect(Array.from(document.querySelectorAll('[role=tooltip]'), (node) => node.textContent)).toEqual(['Second hint']);
  expect(wrapper.emitted('update:open')).toBeUndefined();
});

it('hides a controlled tooltip on handoff and lets an explicit reopen take ownership again', async () => {
  wrapper = mount(Tooltip, {
    props: { content: 'Controlled hint', open: true, fadeDuration: 200 },
    slots: { default: '<button>First</button>' },
    attachTo: document.body,
  });
  await wrapper.vm.$nextTick();
  expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Controlled hint');
  second = mount(Tooltip, {
    props: { content: 'New hint', defaultOpen: true },
    slots: { default: '<button>Second</button>' },
    attachTo: document.body,
  });
  await second.vm.$nextTick();
  expect(Array.from(document.querySelectorAll('[role=tooltip]'), (node) => node.textContent)).toEqual(['New hint']);
  expect(wrapper.emitted('update:open')).toEqual([[false]]);
  expect(wrapper.get('button').attributes('aria-describedby')).toBeUndefined();

  await wrapper.setProps({ open: false });
  await wrapper.setProps({ open: true });
  expect(Array.from(document.querySelectorAll('[role=tooltip]'), (node) => node.textContent)).toEqual([
    'Controlled hint',
  ]);
});

it('removes a previous tooltip that is already fading out', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  wrapper = mount(Tooltip, {
    props: { content: 'Fading hint', openDelay: 0, fadeDuration: 200 },
    slots: { default: '<button>First</button>' },
    attachTo: document.body,
  });
  const trigger = wrapper.get('button');
  await trigger.trigger('pointerenter');
  await vi.advanceTimersByTimeAsync(1);
  await trigger.trigger('pointerleave');
  await vi.advanceTimersByTimeAsync(1);
  expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Fading hint');

  second = mount(Tooltip, {
    props: { content: 'New hint', defaultOpen: true },
    slots: { default: '<button>Second</button>' },
    attachTo: document.body,
  });
  await second.vm.$nextTick();
  expect(Array.from(document.querySelectorAll('[role=tooltip]'), (node) => node.textContent)).toEqual(['New hint']);
});
