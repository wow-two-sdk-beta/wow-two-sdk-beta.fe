import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import { AddressEditor, Field, FontPicker, MarkdownEditor, ReactionPicker } from '@src/presentation/forms';

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

function render(component: unknown, props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(component as Component, { props, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

function key(target: Element, name: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
}

describe('AddressEditor', () => {
  function labelFor(wrapper: VueWrapper, control: Element): string {
    return wrapper.get(`label[for="${control.id}"]`).text();
  }

  it('relabels the region and postal fields for the picked country and clears the region', async () => {
    const wrapper = render(AddressEditor, {
      defaultValue: { country: 'US', line1: '1 Main St', city: 'Austin', region: 'TX', postalCode: '73301' },
    });
    const select = wrapper.get<HTMLSelectElement>('select').element;
    const postal = wrapper.get('input[autocomplete=postal-code]').element;
    expect(labelFor(wrapper, postal)).toBe('ZIP code');
    select.value = 'FR';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(labelFor(wrapper, wrapper.get('input[autocomplete=postal-code]').element)).toBe('Code postal');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      { country: 'FR', line1: '1 Main St', city: 'Austin', region: '', postalCode: '73301' },
    ]);
  });

  it('reports each field edit and locks every part inside a disabled field', async () => {
    const wrapper = render(AddressEditor);
    const city = wrapper.get<HTMLInputElement>('input[autocomplete=address-level2]').element;
    city.value = 'Tashkent';
    city.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect((wrapper.emitted('update:modelValue')?.at(-1)?.[0] as { city: string }).city).toBe('Tashkent');

    const locked = mount({ render: () => h(Field, { label: 'Address', isDisabled: true }, () => h(AddressEditor)) });
    wrappers.push(locked);
    const controls = locked.findAll('input:not([type=hidden]), select');
    expect(controls.length).toBeGreaterThan(4);
    expect(controls.every((control) => (control.element as HTMLInputElement).disabled)).toBe(true);
  });
});

describe('FontPicker', () => {
  function options(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[role=option]')];
  }

  it('names its search, walks the fonts by arrow and picks one', async () => {
    const wrapper = render(FontPicker, { 'aria-label': 'Heading font' });
    expect(wrapper.get('button').text()).toBeTruthy();
    await wrapper.get('button').trigger('click');
    await settle();
    const search = document.querySelector<HTMLInputElement>('input[type=search]')!;
    expect(search.getAttribute('aria-label')).toBe('Search fonts');
    search.focus();
    key(search, 'ArrowDown');
    expect(document.activeElement?.getAttribute('aria-selected')).toBe('true');
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement).toBe(options()[1]);
    key(document.activeElement!, 'End');
    expect(document.activeElement).toBe(options().at(-1));
    key(document.activeElement!, 'Home');
    key(document.activeElement!, 'ArrowUp');
    expect(document.activeElement).toBe(search);
    options()[2]!.click();
    await settle();
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
  });

  it('filters by name and says when nothing matches', async () => {
    const wrapper = render(FontPicker);
    await wrapper.get('button').trigger('click');
    await settle();
    const search = document.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'zzz-no-font';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(options()).toHaveLength(0);
    expect(document.body.textContent).toContain('No fonts match.');
  });
});

describe('ReactionPicker', () => {
  it('is one tab stop that the arrows move, naming each reaction', async () => {
    const onMore = vi.fn();
    const wrapper = render(ReactionPicker, { emojis: ['👍', '❤️', '🎉'], selected: ['❤️'], onMore });
    const buttons = (): HTMLButtonElement[] => [
      ...(wrapper.element as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ];
    expect(buttons().map((button) => button.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(buttons()[1]!.getAttribute('aria-label')).toBe('React with ❤️');
    expect(buttons()[1]!.getAttribute('aria-pressed')).toBe('true');
    buttons()[0]!.focus();
    key(buttons()[0]!, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(buttons()[1]);
    expect(buttons().map((button) => button.tabIndex)).toEqual([-1, 0, -1, -1]);
    key(buttons()[1]!, 'End');
    await nextTick();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('More reactions');
    key(document.activeElement!, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(buttons()[0]);
    buttons()[2]!.click();
    expect(wrapper.emitted('select')).toEqual([['🎉']]);
  });
});

describe('MarkdownEditor toolbar', () => {
  it('names each formatting action in words', () => {
    const wrapper = render(MarkdownEditor, { defaultValue: 'Hello' });
    const names = wrapper.findAll('[role=toolbar] button').map((button) => button.attributes('aria-label'));
    expect(names).toEqual(['Heading 1', 'Heading 2', 'Bold', 'Italic', 'Inline code', 'Link', 'List', 'Blockquote']);
  });
});
