import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { TreeSelectPicker, type TreeSelectNode } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const places: ReadonlyArray<TreeSelectNode> = [
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
  { value: 'tokyo', label: 'Tokyo', isDisabled: true },
];

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

function mountPicker(props: Record<string, unknown> = {}): VueWrapper {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
  const wrapper = mount(TreeSelectPicker, {
    props: { nodes: places, ...props },
    attrs: { 'aria-label': 'City' },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

function row(label: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('[role=treeitem]')].find(
    (node) => node.textContent?.trim() === label,
  );
}

describe('TreeSelectPicker', () => {
  it('shows the preset leaf, opens on its branch and picks another leaf', async () => {
    const wrapper = mountPicker({ defaultValue: 'paris', isPathShown: true });
    const trigger = wrapper.get('[aria-label="City"]');
    expect(trigger.text()).toBe('Europe / France / Paris');
    await trigger.trigger('click');
    await settle();
    expect(row('Paris')?.getAttribute('aria-selected')).toBe('true');
    expect(row('France')?.getAttribute('aria-expanded')).toBe('true');
    expect(row('Madrid')).toBeUndefined();
    row('Lyon')!.click();
    await settle();
    expect(wrapper.emitted('update:modelValue')).toEqual([['lyon']]);
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(trigger.text()).toBe('Europe / France / Lyon');
  });

  it('expands branches without picking them and skips disabled leaves', async () => {
    const wrapper = mountPicker();
    expect(wrapper.get('[aria-label="City"]').text()).toBe('Pick an item');
    await wrapper.get('[aria-label="City"]').trigger('click');
    await settle();
    row('Europe')!.click();
    await settle();
    row('Spain')!.click();
    await settle();
    expect(row('Madrid')).toBeDefined();
    row('Tokyo')!.click();
    await settle();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('ships the leaf value and locks the trigger while read-only', () => {
    const named = mountPicker({ defaultValue: 'madrid', name: 'city' });
    expect(named.get<HTMLInputElement>('input[name=city]').element.value).toBe('madrid');
    expect(named.get('[aria-label="City"]').text()).toBe('Madrid');
    const locked = mountPicker({ isReadOnly: true });
    expect(locked.get<HTMLButtonElement>('[aria-label="City"]').element.disabled).toBe(true);
  });
});
