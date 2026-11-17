import { vi } from 'vitest';
import { nextTick, type Component } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { FeedbackBus } from '@src/feedback';
import FeedbackToastHost from '@src/presentation/feedback/feedbackToastHost/FeedbackToastHost.vue';
import { ToastHost, toastHost } from '@src/presentation/feedback/toastHost';

/*
 * Shared setup for the toast and notification `dom` tests. Every mount goes through `attach`, so
 * `resetToasts` (registered with `afterEach` in each file) can unmount it, empty the module-level
 * `toastHost` store, and put back the clock, spies and `HTMLElement.prototype.animate`.
 */

const wrappers: VueWrapper[] = [];
const originalAnimate = HTMLElement.prototype.animate;

/** Lets a store change reach the stack: one tick for the store, one for the render it schedules. */
export const settle = async (): Promise<void> => {
  await nextTick();
  await nextTick();
};

/** Mounts a component into the document and registers it for teardown. */
export const attach = (component: Component, options: Parameters<typeof mount>[1] = {}): VueWrapper => {
  const wrapper = mount(component, { attachTo: document.body, ...options }) as VueWrapper;
  wrappers.push(wrapper);
  return wrapper;
};

/** A `ToastHost` with a 5 s default lifetime unless the props say otherwise. */
export const host = (props: Record<string, unknown> = {}): VueWrapper =>
  attach(ToastHost, { props: { defaultDuration: 5000, ...props } });

/** A `FeedbackToastHost` fed by `bus`. */
export const feedbackHost = (bus: FeedbackBus, props: Record<string, unknown> = {}): VueWrapper =>
  attach(FeedbackToastHost, { props: { bus, ...props } });

/** Unmounts everything `attach` mounted and restores the globals a test may have replaced. */
export const resetToasts = (): void => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  toastHost.dismissAll();
  HTMLElement.prototype.animate = originalAnimate;
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
};

/** Fakes the clock the toast timers read; `frames` also fakes animation frames (the announcer's). */
export const useFakeClock = ({ frames = false } = {}): void => {
  vi.useFakeTimers({
    toFake: [
      'Date',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      ...(frames ? (['requestAnimationFrame', 'cancelAnimationFrame'] as const) : []),
    ],
  });
};

/** The toast stack landmark, once a toast shows. */
export const stack = (): HTMLElement => document.querySelector<HTMLElement>('[role="region"][data-toast-position]')!;

/** The cards on screen, in DOM order, without the ones playing their exit. */
export const cards = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('[data-toast-id]:not([data-toast-exiting])'),
];

/** The card on screen whose text contains `title`. */
export const card = (title: string): HTMLElement | undefined =>
  cards().find((node) => node.textContent?.includes(title));

/** The overflow list's "Show N more" control. */
export const overflowButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>('[data-toast-overflow]');

/** The countdown displays of one kind: `ring`, `seconds` or `closeRing`. */
export const timers = (kind: string): NodeListOf<Element> => document.querySelectorAll(`[data-toast-timer="${kind}"]`);

/** The countdown bars. */
export const bars = (): NodeListOf<Element> => document.querySelectorAll('[data-toast-progress]');

/** Dispatches a cancelable keydown on `target` (the focused element by default) and returns it. */
export const press = (key: string, target: Element = document.activeElement ?? document.body): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

/** Clicks after the listener's first millisecond: Vue ignores events stamped while a listener is attached. */
export const click = async (target: Element): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 2));
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();
};

/** Hovers the stack with a mouse (`enter`) or leaves it. */
export const hover = (isOver: boolean, pointerType = 'mouse'): void => {
  stack().dispatchEvent(new PointerEvent(isOver ? 'pointerenter' : 'pointerleave', { pointerType }));
};

interface FakeAnimation {
  readonly pause: ReturnType<typeof vi.fn>;
  readonly play: ReturnType<typeof vi.fn>;
  readonly cancel: ReturnType<typeof vi.fn>;
}

/** Replaces `animate` with a recorder; `highlights` counts the update highlights among the animated elements. */
export const fakeAnimations = () => {
  const created: FakeAnimation[] = [];
  const animate = vi.fn<(keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation>(() => {
    const animation = Object.assign(new EventTarget(), { pause: vi.fn(), play: vi.fn(), cancel: vi.fn() });
    created.push(animation);
    return animation as unknown as Animation;
  });
  HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate;
  const highlights = () =>
    animate.mock.contexts.filter(
      (target) => target instanceof HTMLElement && target.hasAttribute('data-toast-update-highlight'),
    ).length;
  return { animate, created, highlights };
};
