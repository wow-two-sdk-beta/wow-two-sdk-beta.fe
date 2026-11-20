import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import {
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
} from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

const rows = Array.from({ length: 250 }, (_, index) => `Row ${String(index).padStart(3, '0')}`);

/** A searchable select over 250 rows, opened; returns the errors Vue reported while it ran. */
async function openSelect(): Promise<string[]> {
  const errors: string[] = [];
  const wrapper = mount(
    {
      render: () =>
        h(SelectPicker as Component, null, () => [
          h(SelectPickerTrigger, { 'aria-label': 'Row' }, () => h(SelectPickerValue)),
          h(SelectPickerContent, { isSearchable: true }, () =>
            rows.map((label) => h(SelectPickerItem, { key: label, itemKey: label, label })),
          ),
        ]),
    },
    {
      attachTo: document.body,
      global: { config: { errorHandler: (error) => errors.push(String((error as Error)?.message ?? error)) } },
    },
  );
  wrappers.push(wrapper);
  document.querySelector<HTMLElement>('[aria-label=Row]')!.click();
  await settle();
  return errors;
}

async function search(text: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type=search]')!;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle();
}

const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role=option]')];

describe('ListboxPicker active row while a search hides rows', () => {
  it('moves to the first remaining row when the search hides 240 leading rows, the active one included', async () => {
    const errors = await openSelect();
    expect(options()).toHaveLength(250);
    expect(options()[0]!.hasAttribute('data-active')).toBe(true);

    await search('Row 24');

    expect(errors).toEqual([]);
    expect(options().map((option) => option.textContent?.trim())).toEqual(
      Array.from({ length: 10 }, (_, index) => `Row 24${index}`),
    );
    const active = options().filter((option) => option.hasAttribute('data-active'));
    expect(active.map((option) => option.textContent?.trim())).toEqual(['Row 240']);
    expect(document.querySelector('[role=listbox]')!.getAttribute('aria-activedescendant')).toBe(active[0]!.id);
  });

  it('hides every row without an error and finds an active row again when the search widens', async () => {
    const errors = await openSelect();
    await search('no such row');
    expect(errors).toEqual([]);
    expect(options().map((option) => option.textContent?.trim())).toEqual(['No results']);

    await search('Row 1');
    expect(errors).toEqual([]);
    expect(options()).toHaveLength(100);
    const active = options().filter((option) => option.hasAttribute('data-active'));
    expect(active.map((option) => option.textContent?.trim())).toEqual(['Row 100']);
  });
});
