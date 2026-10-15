import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@src/presentation/overlays';
import { Menu, MenuItem } from '@src/presentation/nav/menu';
import { TextInput } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

function expectRaised(className: string): void {
  expect(className).toContain('bg-popover');
  expect(className).toContain('border-border-strong/60');
  expect(className).toContain('shadow-lg');
}

describe('raised floating surfaces', () => {
  it('draws an open popover as a raised surface', async () => {
    wrappers.push(
      mount(Popover, {
        props: { defaultOpen: true },
        slots: { default: () => [h(PopoverTrigger, null, () => 'Open'), h(PopoverContent, null, () => 'Body')] },
        attachTo: document.body,
      }),
    );
    await nextTick();
    expectRaised(document.querySelector('[role=dialog]')!.className);
  });

  it('draws an open menu as a raised surface and honours its surface props', async () => {
    const anchor = document.body.appendChild(document.createElement('button'));
    wrappers.push(
      mount(Menu, {
        props: { open: true, anchor, elevation: 4 },
        slots: { default: () => h(MenuItem, null, () => 'Edit') },
        attachTo: document.body,
      }),
    );
    await nextTick();
    const className = document.querySelector('[role=menu]')!.className;
    expect(className).toContain('border-border-strong/60');
    expect(className).toContain('shadow-xl');
    expect(className).not.toContain('shadow-lg');
  });

  it('fills form fields from the field token, apart from the popover fill', () => {
    const wrapper = mount(TextInput, { attachTo: document.body });
    wrappers.push(wrapper);
    expect(wrapper.find('.bg-field').exists()).toBe(true);
    expect(wrapper.html()).not.toContain('bg-popover');
  });
});
