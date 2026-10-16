import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import ToastHost, { toastHost } from '@src/presentation/feedback/toastHost/ToastHost.vue';

const wrappers: VueWrapper[] = [];
const originalAnimate = HTMLElement.prototype.animate;

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  toastHost.dismissAll();
  HTMLElement.prototype.animate = originalAnimate;
  document.body.innerHTML = '';
});

const settle = async () => {
  await nextTick();
  await nextTick();
};

const host = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(ToastHost, { props: { defaultDuration: 1000, ...props }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
};

const bars = () => document.querySelectorAll('[data-toast-progress]');

const fakeAnimations = () => {
  const created: Array<{
    pause: ReturnType<typeof vi.fn>;
    play: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  }> = [];
  const animate = vi.fn<(keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation>(() => {
    const animation = { pause: vi.fn(), play: vi.fn(), cancel: vi.fn() };
    created.push(animation);
    return animation as unknown as Animation;
  });
  HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate;
  return { animate, created };
};

describe('toast countdown bar', () => {
  it('is off by default and never shown on sticky toasts', async () => {
    host();
    toastHost.toast({ title: 'Saved' });
    await settle();
    expect(bars()).toHaveLength(0);
    toastHost.dismissAll();
    host({ showProgress: true });
    toastHost.toast({ title: 'Saving', duration: Infinity });
    toastHost.toast({ title: 'Saved' });
    await settle();
    expect(bars()).toHaveLength(1);
  });

  it('lets each toast override the host default', async () => {
    host({ showProgress: true });
    toastHost.toast({ title: 'Quiet', progress: false });
    await settle();
    expect(bars()).toHaveLength(0);
    toastHost.dismissAll();
    await settle();
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    host({ showProgress: false });
    toastHost.toast({ title: 'Counted', progress: true });
    await settle();
    expect(bars()).toHaveLength(1);
    expect(bars()[0]!.getAttribute('aria-hidden')).toBe('true');
  });

  it('counts down over the resolved duration and pauses with the expiry timer', async () => {
    const { animate, created } = fakeAnimations();
    host({ showProgress: true, defaultDuration: 2500 });
    toastHost.toast({ title: 'Material saved' });
    await settle();
    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.calls[0]![1]).toMatchObject({ duration: 2500, easing: 'linear', fill: 'forwards' });
    const stack = document.querySelector('[aria-label="Notifications"]')!;
    stack.dispatchEvent(new MouseEvent('mouseenter'));
    await settle();
    expect(created[0]!.pause).toHaveBeenCalled();
    stack.dispatchEvent(new MouseEvent('mouseleave'));
    await settle();
    expect(created[0]!.play).toHaveBeenCalled();
  });

  it('restarts when the toast updates in place', async () => {
    const { animate, created } = fakeAnimations();
    host({ showProgress: true });
    const id = toastHost.toast({ title: 'Saving', key: 'save' });
    await settle();
    toastHost.update(id, { title: 'Saved' });
    await settle();
    expect(animate).toHaveBeenCalledTimes(2);
    expect(created[0]!.cancel).toHaveBeenCalled();
  });
});
