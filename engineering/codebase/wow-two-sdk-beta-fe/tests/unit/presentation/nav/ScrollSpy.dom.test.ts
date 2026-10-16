import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { useScrollSpy } from '@src/presentation/nav/scrollSpy/UseScrollSpy';

afterEach(() => vi.unstubAllGlobals());

it('observes headings rendered by its own component and clears removed sections', async () => {
  const observed = vi.fn();
  const disconnected = vi.fn();
  let notify: IntersectionObserverCallback | undefined;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }
      observe = observed;
      disconnect = disconnected;
    },
  );
  const ids = ref(['section']);
  const wrapper = mount(
    defineComponent({
      setup() {
        const active = useScrollSpy(ids);
        return () => h('div', [h('h2', { id: 'section' }, 'Section'), h('output', active.value ?? '')]);
      },
    }),
    { attachTo: document.body },
  );
  try {
    await nextTick();
    const target = wrapper.get('h2').element;
    expect(observed).toHaveBeenCalledWith(target);
    notify?.(
      [
        {
          target,
          isIntersecting: true,
          boundingClientRect: new DOMRect(),
          intersectionRect: new DOMRect(),
          rootBounds: null,
          intersectionRatio: 1,
          time: 0,
        },
      ],
      {} as IntersectionObserver,
    );
    await nextTick();
    expect(wrapper.get('output').text()).toBe('section');
    ids.value = [];
    await nextTick();
    expect(wrapper.get('output').text()).toBe('');
    expect(disconnected).toHaveBeenCalledOnce();
  } finally {
    wrapper.unmount();
  }
});
