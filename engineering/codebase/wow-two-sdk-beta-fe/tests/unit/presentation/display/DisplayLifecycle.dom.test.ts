import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CountUpText from '@src/presentation/display/countUpText/CountUpText.vue';
import AnimatedNumberText from '@src/presentation/display/animatedNumberText/AnimatedNumberText.vue';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function animationFrames() {
  let id = 0;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending.set(++id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => pending.delete(handle));
  return {
    pending,
    tick: async () => {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(performance.now() + 2000));
      await nextTick();
    },
  };
}

describe('display lifecycle', () => {
  it('animates updated count targets after the viewport trigger fired', async () => {
    const frames = animationFrames();
    const observers: Array<{ callback: IntersectionObserverCallback; observer: IntersectionObserver }> = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          observers.push({ callback, observer: this as unknown as IntersectionObserver });
        }
        observe() {}
        disconnect() {}
      },
    );
    const wrapper = mount(CountUpText, { props: { to: 10, canTriggerOnView: true } });
    wrappers.push(wrapper);
    await nextTick();
    observers[0]!.callback([{ isIntersecting: true } as IntersectionObserverEntry], observers[0]!.observer);
    await frames.tick();
    expect(wrapper.text()).toBe('10');
    await wrapper.setProps({ to: 20 });
    await frames.tick();
    expect(wrapper.text()).toBe('20');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'settles count durations of %s without a frame loop',
    async (duration) => {
      const frames = animationFrames();
      const wrapper = mount(CountUpText, { props: { to: 10, duration } });
      wrappers.push(wrapper);
      await nextTick();
      expect(wrapper.text()).toBe('10');
      expect(frames.pending.size).toBe(0);
    },
  );

  it.each(['count', 'animated'])('stops %s frames when reduced motion becomes active', async (kind) => {
    const frames = animationFrames();
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
    } as unknown as MediaQueryList);
    const wrapper =
      kind === 'count' ? mount(CountUpText, { props: { to: 10 } }) : mount(AnimatedNumberText, { props: { value: 1 } });
    wrappers.push(wrapper);
    if (kind === 'animated') await wrapper.setProps({ value: 10 });
    await nextTick();
    expect(frames.pending.size).toBe(1);
    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    await nextTick();
    expect(wrapper.text()).toBe('10');
    expect(frames.pending.size).toBe(0);
  });

  it('settles an animated number when its duration becomes negative', async () => {
    const frames = animationFrames();
    const wrapper = mount(AnimatedNumberText, { props: { value: 1 } });
    wrappers.push(wrapper);
    await wrapper.setProps({ value: 10, duration: -1 });
    expect(wrapper.text()).toBe('10');
    expect(frames.pending.size).toBe(0);
  });
});
