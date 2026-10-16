import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  ColorModeProvider,
  useColorMode,
  type ColorModeContextValue,
} from '@src/foundation/primitives/colorModeProvider';
import { RovingFocusGroup, useRovingFocusItem } from '@src/foundation/primitives/rovingFocusGroup';
import DismissableLayer from '@src/foundation/primitives/dismissableLayer/DismissableLayer.vue';
import Announce from '@src/foundation/primitives/announce/Announce.vue';

const wrappers: Array<ReturnType<typeof mount>> = [];
afterEach(() => {
  wrappers
    .splice(0)
    .reverse()
    .forEach((wrapper) => wrapper.unmount());
});

describe('primitive document and focus ownership', () => {
  it('does not dismiss during IME composition', () => {
    let count = 0;
    const wrapper = mount(DismissableLayer, { props: { onEscape: () => count++ } });
    wrappers.push(wrapper);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true }));
    expect(count).toBe(0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(count).toBe(1);
  });

  it('never lets a disabled active item reclaim the tab stop on focusout', async () => {
    const Item = defineComponent({
      props: { active: Boolean, disabled: Boolean },
      setup(props) {
        const item = useRovingFocusItem({ isActive: () => props.active });
        return () => h('button', { ...item, disabled: props.disabled }, props.active ? 'selected' : 'available');
      },
    });
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(RovingFocusGroup, {}, () => [h(Item, { active: true, disabled: true }), h(Item)]),
      }),
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    await nextTick();
    expect(wrapper.get('button:disabled').attributes('tabindex')).toBe('-1');
    expect(wrapper.get('button:not(:disabled)').attributes('tabindex')).toBe('0');
    wrapper.get<HTMLButtonElement>('button:not(:disabled)').element.focus();
    wrapper.get('[role="group"]').element.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }));
    await nextTick();
    expect(wrapper.get('button:disabled').attributes('tabindex')).toBe('-1');
    expect(wrapper.get('button:not(:disabled)').attributes('tabindex')).toBe('0');
  });

  it('restores document styles and preserves the active nested mode owner', async () => {
    const root = document.documentElement;
    const initialClass = root.className;
    const initialStyle = root.getAttribute('style');
    root.classList.remove('dark');
    root.style.setProperty('color-scheme', 'light dark', 'important');
    const inner = ref(true);
    const modes = new Map<string, ColorModeContextValue>();
    const Probe = defineComponent({
      props: { name: { type: String, required: true } },
      setup(props) {
        modes.set(props.name, useColorMode());
        return () => h('span');
      },
    });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(ColorModeProvider, { defaultMode: 'dark', storageKey: null }, () => [
            h(Probe, { name: 'outer' }),
            inner.value
              ? h(ColorModeProvider, { defaultMode: 'light', storageKey: null }, () => h(Probe, { name: 'inner' }))
              : null,
          ]),
      }),
    );
    try {
      await nextTick();
      expect(root.classList.contains('dark')).toBe(false);
      modes.get('outer')!.setMode('light');
      await nextTick();
      modes.get('inner')!.setMode('dark');
      await nextTick();
      expect(root.classList.contains('dark')).toBe(true);
      modes.get('outer')!.setMode('dark');
      await nextTick();
      modes.get('outer')!.setMode('light');
      await nextTick();
      expect(root.classList.contains('dark')).toBe(true);
      inner.value = false;
      await nextTick();
      expect(root.classList.contains('dark')).toBe(false);
      wrapper.unmount();
      expect(root.style.getPropertyValue('color-scheme')).toBe('light dark');
      expect(root.style.getPropertyPriority('color-scheme')).toBe('important');
      expect(root.classList.contains('dark')).toBe(false);
    } finally {
      wrapper.unmount();
      root.className = initialClass;
      if (initialStyle === null) root.removeAttribute('style');
      else root.setAttribute('style', initialStyle);
    }
  });

  it('keeps a later independent mode owner active when an earlier owner unmounts', async () => {
    const first = mount(ColorModeProvider, { props: { defaultMode: 'dark', storageKey: null } });
    const second = mount(ColorModeProvider, { props: { defaultMode: 'light', storageKey: null } });
    wrappers.push(second);
    await nextTick();
    first.unmount();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('keeps forwarded live-region attributes reactive', async () => {
    const value = ref('first');
    const wrapper = mount(
      defineComponent({ setup: () => () => h(Announce, { class: value.value, 'data-message': value.value }) }),
    );
    wrappers.push(wrapper);
    value.value = 'second';
    await nextTick();
    expect(wrapper.classes()).toContain('second');
    expect(wrapper.classes()).not.toContain('first');
    expect(wrapper.attributes('data-message')).toBe('second');
  });

  it('keeps live regions visually hidden without consumer utility CSS', () => {
    const wrapper = mount(Announce, { slots: { default: 'Saved' } });
    wrappers.push(wrapper);
    const style = (wrapper.element as HTMLElement).style;
    expect(style.position).toBe('absolute');
    expect(style.width).toBe('1px');
    expect(style.height).toBe('1px');
    expect(style.overflow).toBe('hidden');
    expect(style.clipPath).toBe('inset(50%)');
  });
});
