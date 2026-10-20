import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { ScrollIdleDelay, ScrollingAttribute, useScrollActivity } from '@src/foundation/dom';
import { ScrollViewport } from '@src/foundation/primitives';
import { AppShell, AppShellMain, ScrollArea, VirtualScrollArea } from '@src/presentation/layout';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

/** Delivers one scroll event, as a wheel or a touch drag would. */
const scrollOn = (element: Element): void => {
  element.dispatchEvent(new Event('scroll'));
};

describe('scrollbar auto-hide', () => {
  describe.each([
    [
      'ScrollArea',
      (props: Record<string, unknown>) =>
        mount(ScrollArea, { props, slots: { default: () => 'Content' }, attachTo: document.body }),
      (wrapper: VueWrapper) => wrapper.element as HTMLElement,
    ],
    [
      'ScrollViewport',
      (props: Record<string, unknown>) =>
        mount(ScrollViewport, { props, slots: { default: () => 'Content' }, attachTo: document.body }),
      (wrapper: VueWrapper) => wrapper.element as HTMLElement,
    ],
    [
      'VirtualScrollArea',
      (props: Record<string, unknown>) =>
        mount(VirtualScrollArea<string>, {
          props: { items: [], itemSize: 20, ...props },
          slots: { default: () => 'Row' },
          attachTo: document.body,
        }),
      (wrapper: VueWrapper) => wrapper.get('[data-orientation]').element as HTMLElement,
    ],
    [
      'AppShellMain',
      (props: Record<string, unknown>) =>
        mount(
          defineComponent({
            props: { hasAutoHideScrollbar: { type: Boolean, default: false } },
            setup: (own) => () =>
              h(AppShell, null, {
                default: () => h(AppShellMain, { hasAutoHideScrollbar: own.hasAutoHideScrollbar }, () => 'Content'),
              }),
          }),
          { props, attachTo: document.body },
        ),
      (wrapper: VueWrapper) => wrapper.get('main').element as HTMLElement,
    ],
  ] as const)('%s', (_name, render, areaOf) => {
    it('keeps the scrollbar visible by default', async () => {
      const wrapper = track(render({}));
      await nextTick();
      const area = areaOf(wrapper);
      expect(area.classList.contains('scrollbar-auto-hide')).toBe(false);
      scrollOn(area);
      expect(area.hasAttribute(ScrollingAttribute)).toBe(false);
    });

    it('opts in with hasAutoHideScrollbar', async () => {
      const wrapper = track(render({ hasAutoHideScrollbar: true }));
      await nextTick();
      expect(areaOf(wrapper).classList.contains('scrollbar-auto-hide')).toBe(true);
    });

    it('marks the area while it scrolls and clears the mark once it is idle', async () => {
      const wrapper = track(render({ hasAutoHideScrollbar: true }));
      await nextTick();
      const area = areaOf(wrapper);
      expect(area.hasAttribute(ScrollingAttribute)).toBe(false);
      scrollOn(area);
      expect(area.hasAttribute(ScrollingAttribute)).toBe(true);
      vi.advanceTimersByTime(ScrollIdleDelay - 100);
      scrollOn(area);
      vi.advanceTimersByTime(ScrollIdleDelay - 100);
      expect(area.hasAttribute(ScrollingAttribute)).toBe(true);
      vi.advanceTimersByTime(100);
      expect(area.hasAttribute(ScrollingAttribute)).toBe(false);
    });

    it('drops the class and the mark when the prop turns off', async () => {
      const wrapper = track(render({ hasAutoHideScrollbar: true }));
      await nextTick();
      const area = areaOf(wrapper);
      scrollOn(area);
      expect(area.hasAttribute(ScrollingAttribute)).toBe(true);
      await wrapper.setProps({ hasAutoHideScrollbar: false });
      expect(area.classList.contains('scrollbar-auto-hide')).toBe(false);
      expect(area.hasAttribute(ScrollingAttribute)).toBe(false);
    });
  });

  it('leaves a document shell alone: only the region scrolls', async () => {
    const wrapper = track(
      mount(AppShell, {
        props: { scroll: 'document' },
        slots: { default: () => h(AppShellMain, { hasAutoHideScrollbar: true }, () => 'Content') },
        attachTo: document.body,
      }),
    );
    await nextTick();
    const main = wrapper.get('main').element;
    expect(main.classList.contains('scrollbar-auto-hide')).toBe(false);
    scrollOn(main);
    expect(main.hasAttribute(ScrollingAttribute)).toBe(false);
  });

  it('marks a plain element through useScrollActivity and clears it on unmount', async () => {
    const isEnabled = ref(true);
    const Host = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        useScrollActivity(el, isEnabled);
        return () => h('div', { ref: el, class: 'scrollbar-auto-hide' }, 'Content');
      },
    });
    const wrapper = track(mount(Host, { attachTo: document.body }));
    await nextTick();
    const area = wrapper.element as HTMLElement;
    scrollOn(area);
    expect(area.hasAttribute(ScrollingAttribute)).toBe(true);
    isEnabled.value = false;
    await nextTick();
    expect(area.hasAttribute(ScrollingAttribute)).toBe(false);
    scrollOn(area);
    expect(area.hasAttribute(ScrollingAttribute)).toBe(false);
    isEnabled.value = true;
    scrollOn(area);
    expect(area.hasAttribute(ScrollingAttribute)).toBe(true);
    wrapper.unmount();
    expect(area.hasAttribute(ScrollingAttribute)).toBe(false);
  });
});
