import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { DisclosureButton, Toolbar, ToolbarButton, ToolbarLink, ToolbarSeparator } from '@src/presentation/actions';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 3; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

async function press(key: string): Promise<void> {
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
  await settle();
}

describe('Toolbar', () => {
  function mountToolbar(props: Record<string, unknown> = {}): VueWrapper {
    const wrapper = mount(Toolbar, {
      props,
      attrs: { 'aria-label': 'Formatting' },
      slots: {
        default: () => [
          h(ToolbarButton, { 'data-tool': 'bold' }, () => 'Bold'),
          h(ToolbarButton, { 'data-tool': 'italic' }, () => 'Italic'),
          h(ToolbarSeparator),
          h(ToolbarLink, { href: '#help', 'data-tool': 'help' }, () => 'Help'),
        ],
      },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  function tabStops(wrapper: VueWrapper): string[] {
    return wrapper
      .findAll('[data-tool]')
      .filter((node) => node.attributes('tabindex') === '0')
      .map((node) => node.attributes('data-tool')!);
  }

  it('is a named toolbar with one roving tab stop that arrows move and wrap', async () => {
    const wrapper = mountToolbar();
    await settle();
    expect(wrapper.get('[role=toolbar]').attributes('aria-label')).toBe('Formatting');
    expect(tabStops(wrapper)).toEqual(['bold']);
    (wrapper.get('[data-tool=bold]').element as HTMLElement).focus();
    await settle();
    await press('ArrowRight');
    expect(document.activeElement?.getAttribute('data-tool')).toBe('italic');
    await press('ArrowRight');
    expect(document.activeElement?.getAttribute('data-tool')).toBe('help');
    await press('End');
    expect(document.activeElement?.getAttribute('data-tool')).toBe('help');
    await press('Home');
    expect(document.activeElement?.getAttribute('data-tool')).toBe('bold');
    expect(tabStops(wrapper)).toEqual(['bold']);
  });

  it('moves with the vertical arrows when vertical', async () => {
    const wrapper = mountToolbar({ orientation: 'vertical' });
    expect(wrapper.get('[role=toolbar]').attributes('aria-orientation')).toBe('vertical');
    (wrapper.get('[data-tool=bold]').element as HTMLElement).focus();
    await settle();
    await press('ArrowDown');
    expect(document.activeElement?.getAttribute('data-tool')).toBe('italic');
  });
});

describe('DisclosureButton', () => {
  it('toggles its expanded state and reports each change', async () => {
    const wrapper = mount(DisclosureButton, { slots: { default: () => 'Details' }, attachTo: document.body });
    wrappers.push(wrapper);
    const button = wrapper.get('button');
    expect(button.attributes('type')).toBe('button');
    expect(button.attributes('aria-expanded')).toBe('false');
    await button.trigger('click');
    expect(button.attributes('aria-expanded')).toBe('true');
    await button.trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
  });

  it('stays where a controlled owner keeps it', async () => {
    const wrapper = mount(DisclosureButton, { props: { open: true }, slots: { default: () => 'Details' } });
    wrappers.push(wrapper);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
  });
});
