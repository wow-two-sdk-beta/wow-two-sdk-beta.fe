import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import {
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
} from '@src/presentation/forms';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

async function trigger(triggerProps: Record<string, unknown>): Promise<HTMLButtonElement> {
  wrapper = mount(
    {
      render: () =>
        h('div', { style: 'width: 400px' }, [
          h(SelectPicker as Component, { defaultValue: 'a', isClearable: true }, () => [
            h(SelectPickerTrigger, { 'aria-label': 'Kind', ...triggerProps }, () => h(SelectPickerValue)),
            h(SelectPickerContent, null, () => h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'All' })),
          ]),
        ]),
    },
    { attachTo: document.body },
  );
  await nextTick();
  return document.querySelector<HTMLButtonElement>('button[aria-haspopup=listbox]')!;
}

it('stretches across its container by default', async () => {
  expect((await trigger({})).getBoundingClientRect().width).toBe(400);
});

it('takes an explicit width and keeps the clear control inside it', async () => {
  const button = await trigger({ width: '11rem' });
  const box = button.getBoundingClientRect();
  expect(box.width).toBe(176);
  const clear = button.parentElement!.querySelector<HTMLElement>('button:not([aria-haspopup])');
  expect(clear).not.toBeNull();
  expect(clear!.getBoundingClientRect().right).toBeLessThanOrEqual(box.right);
});

it('sizes to its value when not full width', async () => {
  const width = (await trigger({ isFullWidth: false })).getBoundingClientRect().width;
  expect(width).toBeGreaterThan(0);
  expect(width).toBeLessThan(400);
});
