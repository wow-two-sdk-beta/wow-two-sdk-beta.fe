import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, type Component } from 'vue';
import { TransferPicker, type TransferOption } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

const options: ReadonlyArray<TransferOption<string>> = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Bravo', description: 'Second' },
  { key: 'c', label: 'Charlie', isDisabled: true },
  { key: 'd', label: 'Delta' },
  { key: 'e', label: 'Echo' },
];

function mountTransfer(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(TransferPicker as unknown as Component, {
    props: { options, defaultValue: ['d'], ...props },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

function panel(wrapper: VueWrapper, side: 'source' | 'target'): HTMLElement {
  return wrapper.get(`section[data-side=${side}]`).element as HTMLElement;
}

/** The option labels a list shows, skipping its empty-state row. */
function labels(wrapper: VueWrapper, side: 'source' | 'target'): string[] {
  return [...panel(wrapper, side).querySelectorAll('[role=option]')].flatMap((node) => {
    const label = node.querySelector('.truncate')?.textContent?.trim();
    return label ? [label] : [];
  });
}

async function check(wrapper: VueWrapper, side: 'source' | 'target', label: string): Promise<void> {
  const option = [...panel(wrapper, side).querySelectorAll<HTMLElement>('[role=option]')].find((node) =>
    node.textContent?.includes(label),
  )!;
  option.click();
  await nextTick();
}

function moveButton(wrapper: VueWrapper, name: string): HTMLButtonElement {
  return wrapper.get<HTMLButtonElement>(`button[aria-label="${name}"]`).element;
}

async function press(wrapper: VueWrapper, name: string): Promise<void> {
  moveButton(wrapper, name).click();
  await nextTick();
}

function lastKeys(wrapper: VueWrapper): unknown {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0];
}

describe('TransferPicker', () => {
  it('lists what is left and what is picked, then moves the checked options across', async () => {
    const wrapper = mountTransfer();
    expect(labels(wrapper, 'source')).toEqual(['Alpha', 'Bravo', 'Charlie', 'Echo']);
    expect(labels(wrapper, 'target')).toEqual(['Delta']);
    const sourceList = panel(wrapper, 'source').querySelector('[role=listbox]')!;
    expect(document.getElementById(sourceList.getAttribute('aria-labelledby')!)?.textContent).toBe('Available');
    expect(moveButton(wrapper, 'Add checked').disabled).toBe(true);
    await check(wrapper, 'source', 'Bravo');
    await check(wrapper, 'source', 'Alpha');
    expect(panel(wrapper, 'source').textContent).toContain('2/4');
    await press(wrapper, 'Add checked');
    expect(lastKeys(wrapper)).toEqual(['d', 'a', 'b']);
    expect(labels(wrapper, 'source')).toEqual(['Charlie', 'Echo']);
    expect(labels(wrapper, 'target')).toEqual(['Delta', 'Alpha', 'Bravo']);
    expect(panel(wrapper, 'source').textContent).toContain('0/2');
  });

  it('moves every enabled option, and removes checked ones', async () => {
    const wrapper = mountTransfer();
    await press(wrapper, 'Add all');
    expect(lastKeys(wrapper)).toEqual(['d', 'a', 'b', 'e']);
    expect(labels(wrapper, 'source')).toEqual(['Charlie']);
    expect(moveButton(wrapper, 'Add all').disabled).toBe(true);
    await check(wrapper, 'target', 'Delta');
    await press(wrapper, 'Remove checked');
    expect(lastKeys(wrapper)).toEqual(['a', 'b', 'e']);
    await press(wrapper, 'Remove all');
    expect(lastKeys(wrapper)).toEqual([]);
  });

  it('filters each list and moves only what the filter shows', async () => {
    const wrapper = mountTransfer({ isSearchable: true });
    await wrapper.get('section[data-side=source] input[type=search]').setValue('r');
    expect(labels(wrapper, 'source')).toEqual(['Bravo', 'Charlie']);
    await press(wrapper, 'Add all');
    expect(lastKeys(wrapper)).toEqual(['d', 'b']);
    await wrapper.get('section[data-side=source] input[type=search]').setValue('zzz');
    expect(panel(wrapper, 'source').textContent).toContain('No matches');
  });

  it('moves one option on double-click, ships hidden inputs and locks while disabled', async () => {
    const wrapper = mountTransfer({ name: 'members' });
    const echo = [...panel(wrapper, 'source').querySelectorAll<HTMLElement>('[role=option]')].find((node) =>
      node.textContent?.includes('Echo'),
    )!;
    echo.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextTick();
    expect(lastKeys(wrapper)).toEqual(['d', 'e']);
    expect(wrapper.findAll('input[type=hidden][name=members]').map((input) => input.attributes('value'))).toEqual([
      'd',
      'e',
    ]);
    const locked = mountTransfer({ isDisabled: true });
    expect(
      ['Add checked', 'Add all', 'Remove checked', 'Remove all'].every((name) => moveButton(locked, name).disabled),
    ).toBe(true);
  });
});
