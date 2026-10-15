import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { Popover, PopoverContent, PopoverTrigger } from '@src/presentation/overlays';
import { TextInput } from '@src/presentation/forms';
import '@src/index.css';

// Forced colours replace fills with system colours and drop shadows by design, so there is nothing to compare.
const isForcedColors = matchMedia('(forced-colors: active)').matches;

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.documentElement.classList.remove('dark');
  document.body.innerHTML = '';
});

async function paint(isDark: boolean): Promise<{ field: CSSStyleDeclaration; panel: CSSStyleDeclaration }> {
  document.documentElement.classList.toggle('dark', isDark);
  wrapper = mount(
    {
      render: () => [
        h(TextInput, { 'data-field': '' }),
        h(Popover, { defaultOpen: true }, () => [
          h(PopoverTrigger, null, () => 'Open'),
          h(PopoverContent, null, () => 'Body'),
        ]),
      ],
    },
    { attachTo: document.body },
  );
  await nextTick();
  await expect.poll(() => document.querySelector('[role=dialog]') !== null).toBe(true);
  const field = document.querySelector<HTMLElement>('.bg-field')!;
  return { field: getComputedStyle(field), panel: getComputedStyle(document.querySelector('[role=dialog]')!) };
}

it.skipIf(isForcedColors)('separates an open popover from the fields it covers in dark mode by fill', async () => {
  const { field, panel } = await paint(true);
  expect(panel.backgroundColor).not.toBe(field.backgroundColor);
});

it.skipIf(isForcedColors)('gives an open popover a visible border and a large shadow in light mode', async () => {
  const { field, panel } = await paint(false);
  expect(panel.borderTopWidth).toBe('1px');
  expect(panel.borderTopColor).not.toBe(field.backgroundColor);
  expect(panel.boxShadow).not.toBe('none');
});
