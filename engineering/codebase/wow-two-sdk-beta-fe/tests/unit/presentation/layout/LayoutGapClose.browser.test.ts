import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { userEvent } from 'vitest/browser';
import { TruncatedText } from '@src/presentation/display';
import { StickyLayout, VirtualScrollArea } from '@src/presentation/layout';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const LongCopy =
  'Dynamic codes keep their printed pattern while the destination changes behind them. Scans are counted per ' +
  'device and country, destinations can be scheduled, and a code can be paused without reprinting anything.';

it('clamps overflowing copy to its lines and expands it in place', async () => {
  wrapper = mount(TruncatedText, {
    props: { lines: 2 },
    attrs: { style: 'width: 180px; font-size: 14px; line-height: 20px' },
    slots: { default: () => LongCopy },
    attachTo: document.body,
  });
  const content = wrapper.get('[data-state]').element as HTMLElement;
  await expect.poll(() => wrapper!.find('button').exists()).toBe(true);
  expect(content.clientHeight).toBeLessThanOrEqual(44);
  expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
  await userEvent.click(wrapper.get('button').element);
  await expect.poll(() => content.clientHeight).toBeGreaterThan(44);
  expect(wrapper.get('button').text()).toBe('Show less');
});

it('shows no toggle for copy that fits', async () => {
  wrapper = mount(TruncatedText, {
    props: { lines: 3 },
    attrs: { style: 'width: 400px' },
    slots: { default: () => 'Short.' },
    attachTo: document.body,
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(wrapper.find('button').exists()).toBe(false);
});

it('windows ten thousand rows and reports the end after a real scroll', async () => {
  const ended = ref(0);
  const items = Array.from({ length: 10_000 }, (_, index) => `Row ${index}`);
  wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          VirtualScrollArea<string>,
          {
            items,
            itemSize: 20,
            style: 'height: 200px',
            'onEnd-reached': () => (ended.value += 1),
          },
          { default: ({ item }: { item: string }) => h('div', { style: 'height: 20px' }, item) },
        ),
    }),
    { attachTo: document.body },
  );
  const viewport = wrapper.get('[data-orientation]').element as HTMLElement;
  await expect.poll(() => wrapper!.findAll('[data-index]').length).toBeGreaterThan(5);
  expect(wrapper.findAll('[data-index]').length).toBeLessThan(30);
  viewport.scrollTop = viewport.scrollHeight;
  await expect.poll(() => wrapper!.find('[data-index="9999"]').exists()).toBe(true);
  await expect.poll(() => ended.value).toBe(1);
});

it('reports a real pin once its sentinel scrolls past the top edge', async () => {
  const root = ref<HTMLElement | null>(null);
  const pins: boolean[] = [];
  wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          'div',
          { ref: (node: unknown) => (root.value = node as HTMLElement), style: 'height: 150px; overflow: auto' },
          [
            h('p', { style: 'height: 60px' }, 'Intro'),
            h(StickyLayout, { root: root.value, 'onStuck-change': (stuck: boolean) => pins.push(stuck) }, () =>
              h('div', { style: 'height: 24px; background: white' }, 'Header'),
            ),
            h('div', { style: 'height: 1200px' }, 'Body'),
          ],
        ),
    }),
    { attachTo: document.body },
  );
  await expect.poll(() => root.value !== null).toBe(true);
  root.value!.scrollTop = 400;
  await expect.poll(() => pins.at(-1)).toBe(true);
  expect(wrapper.get('.sticky').attributes('data-stuck')).toBe('');
  root.value!.scrollTop = 0;
  await expect.poll(() => pins.at(-1)).toBe(false);
});
