import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { Presence } from '@src/foundation/primitives';

/*
 * `Presence` must not depend on `requestAnimationFrame` actually firing.
 *
 * rAF is suspended entirely while `document.hidden` — a background tab, a prerender, an
 * embedded webview, and (measured: 0 ticks in 13.4s) the Claude browser pane. Both of
 * `Presence`'s effects used to live inside a double rAF, and the exit's safety timeout was
 * armed INSIDE that rAF, so every path converged on the same failure: the child mounted stuck
 * at `data-state="closed"` and then never unmounted on close, leaving a full-viewport
 * `pointer-events: auto` layer over a page that looked idle.
 *
 * These tests reproduce that environment by stubbing rAF to accept callbacks and never invoke
 * them — which is what a hidden document does — and assert that both halves still complete.
 */

/** Waits real time; the fallback path is timer-driven, so fake timers would test nothing. */
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Longer than the two-frame fallback (32ms) and the exit safety timer (duration + 100ms). */
const SETTLE_MS = 320;

const originalRaf = globalThis.requestAnimationFrame;
const originalCancelRaf = globalThis.cancelAnimationFrame;

/** Replaces rAF with one that queues callbacks and never runs them, as a hidden document does. */
function suspendAnimationFrames(): void {
  globalThis.requestAnimationFrame = (() => 1) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => undefined) as typeof globalThis.cancelAnimationFrame;
}

afterEach(() => {
  globalThis.requestAnimationFrame = originalRaf;
  globalThis.cancelAnimationFrame = originalCancelRaf;
});

/** A `Presence` around one probe div, with `isPresent` driven from the outside. */
function harness() {
  const isPresent = ref(true);
  const wrapper = mount(
    defineComponent({
      setup: () => () => h(Presence, { isPresent: isPresent.value }, { default: () => h('div', { id: 'child' }) }),
    }),
  );
  return { isPresent, wrapper };
}

describe('foundation/primitives — Presence without requestAnimationFrame', () => {
  it('enters: flips to data-state="open" on the timer fallback', async () => {
    suspendAnimationFrames();
    const { wrapper } = harness();

    // The enter deliberately starts closed so the consumer's enter transition has a from-state.
    expect(wrapper.find('#child').attributes('data-state')).toBe('closed');

    await wait(SETTLE_MS);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#child').attributes('data-state')).toBe('open');
    wrapper.unmount();
  });

  it('exits: unmounts the child even though no frame callback ever runs', async () => {
    suspendAnimationFrames();
    const { isPresent, wrapper } = harness();
    await wait(SETTLE_MS);
    await wrapper.vm.$nextTick();

    isPresent.value = false;
    await wrapper.vm.$nextTick();
    await wait(SETTLE_MS);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#child').exists(), 'child stayed mounted after close').toBe(false);
    wrapper.unmount();
  });

  it('exits on the safety timer when an animation starts but never ends', async () => {
    suspendAnimationFrames();
    /* Reports a running animation, so the "nothing is animating, drop it now" fast path does
       NOT fire. With no `animationend` either, the up-front safety timer is the only way out —
       exactly the case that used to hang, because that timer was armed inside the rAF. */
    const originalGetAnimations = Element.prototype.getAnimations;
    Element.prototype.getAnimations = (() => [{}]) as unknown as typeof originalGetAnimations;

    try {
      const { isPresent, wrapper } = harness();
      await wait(SETTLE_MS);
      await wrapper.vm.$nextTick();

      isPresent.value = false;
      await wrapper.vm.$nextTick();
      await wait(SETTLE_MS);
      await wrapper.vm.$nextTick();

      expect(wrapper.find('#child').exists(), 'child never unmounted').toBe(false);
      wrapper.unmount();
    } finally {
      Element.prototype.getAnimations = originalGetAnimations;
    }
  });
});

describe('foundation/primitives — Presence with requestAnimationFrame', () => {
  it('keeps the child while another exit property is still animating', async () => {
    const { isPresent, wrapper } = harness();
    const element = wrapper.get('#child').element;
    let running = true;
    Object.defineProperty(element, 'getAnimations', { value: () => (running ? [{ playState: 'running' }] : []) });
    try {
      isPresent.value = false;
      await wrapper.vm.$nextTick();
      element.dispatchEvent(new Event('transitionend'));
      await wrapper.vm.$nextTick();
      expect(wrapper.find('#child').exists()).toBe(true);
      running = false;
      element.dispatchEvent(new Event('transitionend'));
      await wrapper.vm.$nextTick();
      expect(wrapper.find('#child').exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
  it('still enters and exits on the normal frame path', async () => {
    const { isPresent, wrapper } = harness();
    await wait(SETTLE_MS);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('#child').attributes('data-state')).toBe('open');

    isPresent.value = false;
    await wrapper.vm.$nextTick();
    await wait(SETTLE_MS);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('#child').exists()).toBe(false);

    wrapper.unmount();
  });
});
