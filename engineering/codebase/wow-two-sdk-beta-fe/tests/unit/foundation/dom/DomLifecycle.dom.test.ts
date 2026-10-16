import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive, useTemplateRef } from 'vue';
import { useFocusTrap } from '@src/foundation/dom/hooks/UseFocusTrap';
import { useEventListener } from '@src/foundation/dom/hooks/UseEventListener';
import { useOutsideClick } from '@src/foundation/dom/hooks/UseOutsideClick';
import { useScrollLock } from '@src/foundation/dom/hooks/UseScrollLock';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
  document.body.style.paddingRight = '';
  document.body.style.overflow = '';
});

it('focuses and wraps past disabled, negative-tabindex and inert descendants', async () => {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
  const wrapper = mount(
    defineComponent({
      setup() {
        const root = useTemplateRef<HTMLElement>('root');
        useFocusTrap(root);
        return () =>
          h('div', { ref: 'root' }, [
            h('button', { disabled: true, tabindex: 0 }, 'disabled'),
            h('button', { tabindex: -2 }, 'negative'),
            h('div', { inert: true }, [h('button', 'inert')]),
            h('button', { id: 'first-enabled' }, 'first'),
            h('button', { id: 'last-enabled' }, 'last'),
          ]);
      },
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await nextTick();
  expect(document.activeElement?.id).toBe('first-enabled');
  const last = wrapper.get<HTMLButtonElement>('#last-enabled');
  last.element.focus();
  await last.trigger('keydown', { key: 'Tab' });
  expect(document.activeElement?.id).toBe('first-enabled');
});

it('adds scrollbar compensation to existing padding and restores nested locks', async () => {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(980);
  document.body.style.paddingRight = '12px';
  const Lock = defineComponent({
    setup() {
      useScrollLock();
      return () => null;
    },
  });
  const first = mount(Lock);
  wrappers.push(first);
  const second = mount(Lock);
  wrappers.push(second);
  await nextTick();
  expect(document.body.style.paddingRight).toBe('32px');
  first.unmount();
  wrappers.splice(wrappers.indexOf(first), 1);
  expect(document.body.style.overflow).toBe('hidden');
  second.unmount();
  wrappers.splice(wrappers.indexOf(second), 1);
  expect(document.body.style.paddingRight).toBe('12px');
  expect(document.body.style.overflow).toBe('');
});

it('removes the original listener when a mutable capture option changes', async () => {
  const options = reactive({ capture: false });
  const listener = vi.fn();
  const wrapper = mount(
    defineComponent({
      setup() {
        useEventListener('click', listener, document.body, options);
        return () => null;
      },
    }),
  );
  wrappers.push(wrapper);
  await nextTick();
  options.capture = true;
  await nextTick();
  document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(listener).toHaveBeenCalledOnce();
  wrapper.unmount();
  wrappers.splice(wrappers.indexOf(wrapper), 1);
  document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(listener).toHaveBeenCalledOnce();
});

it('recognizes clicks inside an open shadow root as inside its target', async () => {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  const button = document.createElement('button');
  shadow.append(button);
  document.body.append(host);
  const outside = vi.fn();
  const wrapper = mount(
    defineComponent({
      setup() {
        useOutsideClick(button, outside);
        return () => null;
      },
    }),
  );
  wrappers.push(wrapper);
  try {
    await nextTick();
    button.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(outside).not.toHaveBeenCalled();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(outside).toHaveBeenCalledOnce();
  } finally {
    host.remove();
  }
});

it('observes outside clicks in the target document and cleans up on disposal', async () => {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  const owner = iframe.contentDocument!;
  const target = owner.createElement('button');
  owner.body.append(target);
  const outside = vi.fn();
  const wrapper = mount(
    defineComponent({
      setup() {
        useOutsideClick(target, outside);
        return () => null;
      },
    }),
  );
  wrappers.push(wrapper);
  try {
    await nextTick();
    owner.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(outside).toHaveBeenCalledOnce();
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    owner.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(outside).toHaveBeenCalledOnce();
  } finally {
    iframe.remove();
  }
});
