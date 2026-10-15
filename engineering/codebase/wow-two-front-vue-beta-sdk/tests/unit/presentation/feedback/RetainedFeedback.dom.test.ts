import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createFeedbackBus, NoticeCategory, NoticeTone } from '@src/feedback';
import FeedbackToastHost from '@src/presentation/feedback/feedbackToastHost/FeedbackToastHost.vue';
import NotificationCenterGroup from '@src/presentation/display/notificationCenterGroup/NotificationCenterGroup.vue';
import { toastHost } from '@src/presentation/feedback/toastHost/ToastHost.vue';

const wrappers: VueWrapper[] = [];
const settle = async () => {
  await nextTick();
  await nextTick();
};
const mountView = (
  component: typeof FeedbackToastHost | typeof NotificationCenterGroup,
  props: Record<string, unknown>,
) => {
  const wrapper = mount(component, { props, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
};
const click = async (target: Element) => {
  // Vue ignores events stamped during the millisecond a listener is attached.
  await new Promise((resolve) => setTimeout(resolve, 2));
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();
};
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  toastHost.dismissAll();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('bus-backed notification surfaces', () => {
  it('requests closing the center without deleting retained history', async () => {
    const bus = createFeedbackBus();
    const close = vi.fn();
    bus.notify({ title: 'Kept', tone: NoticeTone.Info, category: NoticeCategory.Retained });
    const center = mountView(NotificationCenterGroup, { bus, onClose: close });
    await settle();
    await click(center.get('[aria-label="Close notifications"]').element);
    expect(close).toHaveBeenCalledOnce();
    expect(bus.retained()).toHaveLength(1);
  });
  it('uses top-right placement even with the deprecated bottom-right prop', async () => {
    const bus = createFeedbackBus();
    mountView(FeedbackToastHost, { bus, position: 'bottom-right' });
    bus.notify({ title: 'Saved', tone: NoticeTone.Success });
    await settle();
    const stack = document.querySelector('[aria-label="Notifications"]')!;
    expect(stack.classList.contains('top-4')).toBe(true);
    expect(stack.classList.contains('right-4')).toBe(true);
    expect(stack.classList.contains('bottom-4')).toBe(false);
    expect(stack.querySelector('[data-toast-icon]')).not.toBeNull();
    expect(stack.querySelector('[aria-label="Delete notification"]')).toBeNull();
  });

  it('closes a toast while retaining its notice, then deletes it from the center', async () => {
    const bus = createFeedbackBus();
    mountView(FeedbackToastHost, { bus, defaultDuration: Infinity });
    const center = mountView(NotificationCenterGroup, { bus });
    bus.notify({ id: 'kept', title: 'Review required', tone: NoticeTone.Warning, category: NoticeCategory.Retained });
    await settle();
    expect(center.text()).toContain('Review required');
    await click(document.querySelector('[aria-label="Dismiss"]')!);
    expect(bus.retained()).toHaveLength(1);
    expect(document.querySelector('[aria-label="Dismiss"]')).toBeNull();
    await click(center.get('[aria-label="Delete notification"]').element);
    expect(bus.retained()).toEqual([]);
    expect(center.text()).toContain("You're all caught up.");
  });

  it('deletes retained notices directly from a toast and deduplicates stable ids', async () => {
    const bus = createFeedbackBus();
    mountView(FeedbackToastHost, { bus, defaultDuration: Infinity });
    mountView(NotificationCenterGroup, { bus });
    bus.notify({ id: 'same', title: 'Original', tone: NoticeTone.Info, category: NoticeCategory.Retained });
    bus.notify({ id: 'same', title: 'Updated', tone: NoticeTone.Success, category: NoticeCategory.Retained });
    await settle();
    expect(document.querySelectorAll('[aria-label="Dismiss"]')).toHaveLength(1);
    expect(bus.retained()).toHaveLength(1);
    expect(document.body.textContent).not.toContain('Original');
    const stack = document.querySelector('[aria-label="Notifications"]')!;
    await click(stack.querySelector('[aria-label="Delete notification"]')!);
    expect(bus.retained()).toEqual([]);
    expect(document.querySelector('[aria-label="Dismiss"]')).toBeNull();
  });

  it('replays retained notices only into the center and renders type-specific actions', async () => {
    const bus = createFeedbackBus();
    const action = vi.fn();
    bus.notify({
      title: 'Download ready',
      tone: NoticeTone.Success,
      category: NoticeCategory.Retained,
      action: h('button', { type: 'button', onClick: action }, 'Download'),
    });
    mountView(FeedbackToastHost, { bus });
    const center = mountView(NotificationCenterGroup, { bus });
    await settle();
    expect(document.querySelector('[aria-label="Dismiss"]')).toBeNull();
    await click(center.get('button').element);
    expect(action).toHaveBeenCalledOnce();
    expect(bus.retained()).toHaveLength(1);
  });

  it('resets only its own toasts and unsubscribes on bus change or unmount', async () => {
    const first = createFeedbackBus();
    const second = createFeedbackBus();
    const host = mountView(FeedbackToastHost, { bus: first, defaultDuration: Infinity });
    const center = mountView(NotificationCenterGroup, { bus: first });
    first.notify({ title: 'Scoped', tone: NoticeTone.Info, category: NoticeCategory.Retained });
    toastHost.toast({ title: 'Unrelated', duration: Infinity });
    await settle();
    first.reset();
    await settle();
    expect(document.body.textContent).not.toContain('Scoped');
    expect(document.body.textContent).toContain('Unrelated');
    await host.setProps({ bus: second });
    await center.setProps({ bus: second });
    first.notify({ title: 'Old scope', tone: NoticeTone.Info, category: NoticeCategory.Retained });
    second.notify({ title: 'New scope', tone: NoticeTone.Info, category: NoticeCategory.Retained });
    await settle();
    expect(document.body.textContent).not.toContain('Old scope');
    expect(center.text()).toContain('New scope');
    host.unmount();
    center.unmount();
    second.notify({ title: 'After unmount', tone: NoticeTone.Info });
    await settle();
    expect(document.body.textContent).not.toContain('After unmount');
    expect(second.retained()).toHaveLength(1);
  });
});
