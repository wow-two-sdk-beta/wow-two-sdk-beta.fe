import { nativeTab } from '../../../BrowserKeyboard';
import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { CodeEditor } from '@src/presentation/forms';
import { Breadcrumb } from '@src/presentation/nav';
import { Popover, PopoverContent, PopoverTrigger } from '@src/presentation/overlays';
import '@src/index.css';

it('lets Escape then Tab leave the code editor in a real browser', async () => {
  const wrapper = mount(
    {
      render: () => h('div', [h(CodeEditor, { defaultValue: 'source' }), h('button', { id: 'after-editor' }, 'After')]),
    },
    { attachTo: document.body },
  );
  try {
    wrapper.get('textarea').element.focus();
    await userEvent.keyboard('{Escape}');
    await nativeTab();
    expect(document.activeElement?.id).toBe('after-editor');
  } finally {
    wrapper.unmount();
  }
});

it('keeps every breadcrumb ancestor in native Tab order', async () => {
  const wrapper = mount(Breadcrumb, {
    attachTo: document.body,
    props: { items: [{ label: 'Home', href: '/' }, { label: 'Guides', href: '/guides' }, { label: 'Here' }] },
  });
  try {
    const anchors = wrapper.findAll('a');
    anchors[0]!.element.focus();
    await nativeTab();
    expect(document.activeElement).toBe(anchors[1]!.element);
  } finally {
    wrapper.unmount();
  }
});

it('allows focus to leave a nonmodal popover', async () => {
  const wrapper = mount(
    {
      render: () =>
        h('div', [
          h(Popover, null, () => [
            h(PopoverTrigger, null, () => 'Open'),
            h(PopoverContent, null, () => h('button', { id: 'inside-popover' }, 'Inside')),
          ]),
          h('button', { id: 'outside-popover' }, 'Outside'),
        ]),
    },
    { attachTo: document.body },
  );
  try {
    await wrapper.get('button').trigger('click');
    await nextTick();
    const inside = document.getElementById('inside-popover')!;
    inside.focus();
    await nativeTab();
    expect(document.activeElement).not.toBe(inside);
    expect(document.getElementById('outside-popover')!.inert).toBe(false);
  } finally {
    wrapper.unmount();
  }
});
