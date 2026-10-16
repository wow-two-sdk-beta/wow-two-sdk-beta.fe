import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { CascaderPicker, type CascaderOption } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const regions: ReadonlyArray<CascaderOption> = [
  {
    value: 'europe',
    label: 'Europe',
    children: [
      {
        value: 'france',
        label: 'France',
        children: [
          { value: 'paris', label: 'Paris' },
          { value: 'lyon', label: 'Lyon' },
        ],
      },
      { value: 'spain', label: 'Spain', children: [{ value: 'madrid', label: 'Madrid' }] },
    ],
  },
  { value: 'asia', label: 'Asia', isDisabled: true, children: [{ value: 'japan', label: 'Japan' }] },
  { value: 'antarctica', label: 'Antarctica' },
];

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

function mountPicker(props: Record<string, unknown> = {}): VueWrapper {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
  const wrapper = mount(CascaderPicker, {
    props: { options: regions, ...props },
    attrs: { 'aria-label': 'Region' },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

async function open(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('[aria-label="Region"]').trigger('click');
  await settle();
}

function columns(): string[][] {
  return [...document.querySelectorAll('[role=listbox][data-column]')].map((column) =>
    [...column.querySelectorAll('[role=option]')].map((option) => option.textContent?.trim() ?? ''),
  );
}

function option(label: string): HTMLElement {
  return [...document.querySelectorAll<HTMLElement>('[role=option]')].find(
    (node) => node.textContent?.trim() === label,
  )!;
}

async function press(key: string): Promise<void> {
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
  await settle();
}

describe('CascaderPicker', () => {
  it('shows the preset path and opens with its columns', async () => {
    const wrapper = mountPicker({ defaultValue: ['europe', 'france', 'paris'] });
    expect(wrapper.get('[aria-label="Region"]').text()).toBe('Europe / France / Paris');
    await open(wrapper);
    expect(columns()).toEqual([
      ['Europe', 'Asia', 'Antarctica'],
      ['France', 'Spain'],
      ['Paris', 'Lyon'],
    ]);
    expect(option('Paris').getAttribute('aria-selected')).toBe('true');
    expect(option('Europe').getAttribute('aria-haspopup')).toBe('listbox');
    expect(document.querySelector('[data-column="2"]')?.getAttribute('aria-label')).toBe('France');
  });

  it('opens a column per branch click and picks the path at a leaf', async () => {
    const wrapper = mountPicker();
    await open(wrapper);
    expect(columns()).toHaveLength(1);
    option('Europe').click();
    await settle();
    option('Spain').click();
    await settle();
    expect(columns()[2]).toEqual(['Madrid']);
    option('Asia').click();
    await settle();
    expect(columns()).toHaveLength(3);
    option('Madrid').click();
    await settle();
    expect(wrapper.emitted('update:modelValue')).toEqual([[['europe', 'spain', 'madrid']]]);
    expect(wrapper.get('[aria-label="Region"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('[aria-label="Region"]').text()).toBe('Europe / Spain / Madrid');
  });

  it('moves through columns by keyboard and picks with Enter', async () => {
    const wrapper = mountPicker();
    await open(wrapper);
    option('Europe').focus();
    await press('ArrowDown');
    expect(document.activeElement?.textContent?.trim()).toBe('Antarctica');
    await press('ArrowUp');
    await press('ArrowRight');
    expect(document.activeElement?.textContent?.trim()).toBe('France');
    await press('End');
    expect(document.activeElement?.textContent?.trim()).toBe('Spain');
    await press('Enter');
    expect(document.activeElement?.textContent?.trim()).toBe('Madrid');
    await press('ArrowLeft');
    expect(document.activeElement?.textContent?.trim()).toBe('Spain');
    // Spain stays browsed, so its column stays open beside it.
    expect(columns()).toHaveLength(3);
    await press('ArrowRight');
    await press('Enter');
    expect(wrapper.emitted('update:modelValue')).toEqual([[['europe', 'spain', 'madrid']]]);
  });

  it('ships every path value and locks the trigger while read-only', () => {
    const named = mountPicker({ defaultValue: ['europe', 'france', 'lyon'], name: 'region' });
    expect(named.findAll('input[name=region]').map((input) => input.attributes('value'))).toEqual([
      'europe',
      'france',
      'lyon',
    ]);
    const locked = mountPicker({ isReadOnly: true });
    expect(locked.get<HTMLButtonElement>('[aria-label="Region"]').element.disabled).toBe(true);
    expect(locked.get('[aria-label="Region"]').text()).toBe('Pick an option');
  });
});
