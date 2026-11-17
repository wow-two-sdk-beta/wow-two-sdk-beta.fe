import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import {
  createFeedbackBus,
  NoticeCategory,
  NoticePriority,
  NoticeTone,
  type FeedbackBus,
  type FeedbackNotice,
} from '@src/feedback';
import NotificationCenterGroup from '@src/presentation/display/notificationCenterGroup/NotificationCenterGroup.vue';
import NotificationCenterButton from '@src/presentation/display/notificationCenterGroup/NotificationCenterButton.vue';
import { attach, cards, click, fakeAnimations, feedbackHost, resetToasts, settle } from './ToastHarness';

/*
 * The notification center over a bus's retained history: its rows (time, unread mark, progress), the bell
 * button, the header actions, and how it shares notices with a toast host on the same bus.
 */

afterEach(resetToasts);

const retained = (title: string, extra: Partial<FeedbackNotice> = {}): FeedbackNotice => ({
  title,
  tone: NoticeTone.Info,
  category: NoticeCategory.Retained,
  ...extra,
});
const center = (props: Record<string, unknown>) => attach(NotificationCenterGroup, { props });
const bell = (props: { bus: FeedbackBus; isExpanded?: boolean }) => attach(NotificationCenterButton, { props });
const rows = (wrapper: VueWrapper) => wrapper.findAll('[data-notification-history-row]');
const buttonNamed = (wrapper: VueWrapper, name: string) =>
  wrapper.findAll('button').find((button) => button.text() === name || button.attributes('aria-label') === name);
const badge = (wrapper: VueWrapper) => wrapper.find('[data-notification-unread]');

/** Renders a center over a fresh bus that already holds `notices`. */
const centerWith = async (notices: FeedbackNotice[], props: Record<string, unknown> = {}) => {
  const bus = createFeedbackBus();
  for (const notice of notices) bus.notify(notice);
  const wrapper = center({ bus, ...props });
  await settle();
  return { bus, wrapper };
};

describe('history rows', () => {
  it('render each row’s publication time as a machine-readable relative time', async () => {
    const published = Date.now() - 3 * 60_000;
    const { bus, wrapper } = await centerWith([retained('Restored', { publishedAtMs: published }), retained('Fresh')]);
    const [fresh, restored] = rows(wrapper);
    expect(restored!.get('time').attributes('datetime')).toBe(new Date(published).toISOString());
    expect(restored!.get('time').text()).toMatch(/^3 minutes ago$/);
    expect(fresh!.get('time').attributes('datetime')).toBe(new Date(bus.retained()[0]!.publishedAtMs).toISOString());
  });

  it('tick their relative time while open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 15, 12, 0, 0));
    const { wrapper } = await centerWith([retained('Run', { publishedAtMs: Date.now() - 50_000 })]);
    expect(wrapper.get('time').text()).toBe('50 seconds ago');
    await vi.advanceTimersByTimeAsync(15_000);
    expect(wrapper.get('time').text()).toBe('1 minute ago');
  });

  it('mark unread entries as the bus reports them, with a dot hidden from assistive technology', async () => {
    const { bus, wrapper } = await centerWith([
      retained('First', { id: 'first' }),
      retained('Second', { id: 'second' }),
    ]);
    const unread = () => rows(wrapper).map((row) => row.attributes('data-unread') !== undefined);
    expect(unread()).toEqual([true, true]);
    expect(rows(wrapper)[0]!.get('.sr-only').text()).toBe('Unread');
    const dot = rows(wrapper)[0]!.get('span[aria-hidden="true"].rounded-full');
    expect(dot.classes()).toContain('forced-colors:bg-[Highlight]');
    bus.markRead('second');
    await settle();
    expect(unread()).toEqual([false, true]);
    expect(rows(wrapper)[0]!.text()).not.toContain('Unread');
    expect(rows(wrapper)[1]!.text()).toContain('Unread');
    bus.markNotificationsRead();
    await settle();
    expect(unread()).toEqual([false, false]);
    bus.notify(retained('Third', { id: 'third' }));
    await settle();
    expect(unread()).toEqual([true, false, false]);
  });

  it('show a determinate bar named after the title, with its step label', async () => {
    const { wrapper } = await centerWith([
      retained('Uploading report', { progress: { value: 3, max: 10, label: '3 of 10 files' } }),
    ]);
    const bar = wrapper.get('[role="progressbar"]');
    expect(bar.attributes('aria-valuenow')).toBe('3');
    expect(bar.attributes('aria-valuemax')).toBe('10');
    expect(bar.attributes('aria-valuemin')).toBe('0');
    expect(wrapper.get(`#${bar.attributes('aria-labelledby')}`).text()).toBe('Uploading report');
    expect(rows(wrapper)[0]!.text()).toContain('3 of 10 files');
  });

  it('read a missing max as 1 and a missing value as indeterminate', async () => {
    const { wrapper } = await centerWith([
      retained('Halfway', { progress: { value: 0.5 } }),
      retained('Waiting', { progress: {} }),
      retained('Plain'),
    ]);
    const [plain, waiting, halfway] = rows(wrapper);
    expect(plain!.find('[role="progressbar"]').exists()).toBe(false);
    expect(waiting!.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(halfway!.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0.5');
    expect(halfway!.get('[role="progressbar"]').attributes('aria-valuemax')).toBe('1');
  });

  it('drop the bar when the same id is republished without progress', async () => {
    const { bus, wrapper } = await centerWith([retained('Syncing', { id: 'sync', progress: { value: 1, max: 2 } })]);
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(true);
    bus.notify(retained('Synced', { id: 'sync' }));
    await settle();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(rows(wrapper)).toHaveLength(1);
    expect(rows(wrapper)[0]!.text()).toContain('Synced');
  });
});

describe('notification button', () => {
  it('hides the badge while expanded and marks read only when it collapses', async () => {
    const bus = createFeedbackBus();
    const markRead = vi.spyOn(bus, 'markNotificationsRead');
    bus.notify(retained('First'));
    const wrapper = bell({ bus });
    await settle();
    expect(badge(wrapper).text()).toBe('1');
    expect(wrapper.get('button').attributes('aria-label')).toBe('Notifications, 1 unread');
    await wrapper.setProps({ isExpanded: true });
    await settle();
    expect(badge(wrapper).exists()).toBe(false);
    expect(wrapper.get('button').attributes('aria-label')).toBe('Notifications');
    expect(markRead).not.toHaveBeenCalled();
    expect(bus.notificationState().unreadCount).toBe(1);
    bus.notify(retained('Second'));
    await settle();
    expect(badge(wrapper).exists()).toBe(false);
    expect(bus.notificationState().unreadCount).toBe(2);
    await wrapper.setProps({ isExpanded: false });
    await settle();
    expect(markRead).toHaveBeenCalledOnce();
    expect(bus.notificationState().unreadCount).toBe(0);
    expect(badge(wrapper).exists()).toBe(false);
  });

  it('marks read on unmount only while expanded', async () => {
    const closed = createFeedbackBus();
    const open = createFeedbackBus();
    closed.notify(retained('Unseen'));
    open.notify(retained('Seen'));
    const closedBell = bell({ bus: closed });
    const openBell = bell({ bus: open, isExpanded: true });
    await settle();
    closedBell.unmount();
    openBell.unmount();
    expect(closed.notificationState().unreadCount).toBe(1);
    expect(open.notificationState().unreadCount).toBe(0);
  });

  it('marks the old bus read when the bus changes while expanded', async () => {
    const first = createFeedbackBus();
    const second = createFeedbackBus();
    first.notify(retained('Old scope'));
    second.notify(retained('New scope'));
    const wrapper = bell({ bus: first, isExpanded: true });
    await settle();
    await wrapper.setProps({ bus: second });
    await settle();
    expect(first.notificationState().unreadCount).toBe(0);
    expect(second.notificationState().unreadCount).toBe(1);
    await wrapper.setProps({ isExpanded: false });
    await settle();
    expect(second.notificationState().unreadCount).toBe(0);
  });

  it('cues the bell only for notices the pause suppresses', async () => {
    const { animate } = fakeAnimations();
    const bus = createFeedbackBus({ pauseBypass: NoticePriority.Urgent });
    const wrapper = bell({ bus });
    await settle();
    const cue = wrapper.get('[data-notification-cue]').element;
    bus.notify(retained('Not paused'));
    expect(animate).not.toHaveBeenCalled();
    bus.setToastPause('manual');
    bus.notify(retained('Paused', { priority: NoticePriority.High }));
    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.contexts[0]).toBe(cue);
    bus.notify(retained('Breaks through', { priority: NoticePriority.Urgent }));
    expect(animate).toHaveBeenCalledOnce();
  });
});

describe('header actions', () => {
  it('offers Mark all read only with unread entries and Clear all only with entries', async () => {
    const bus = createFeedbackBus();
    const wrapper = center({ bus });
    await settle();
    expect(buttonNamed(wrapper, 'Mark all read')).toBeUndefined();
    expect(buttonNamed(wrapper, 'Clear all')).toBeUndefined();
    bus.notify(retained('Kept', { id: 'kept' }));
    await settle();
    expect(buttonNamed(wrapper, 'Mark all read')).toBeDefined();
    expect(buttonNamed(wrapper, 'Clear all')).toBeDefined();
    bus.markNotificationsRead();
    await settle();
    expect(buttonNamed(wrapper, 'Mark all read')).toBeUndefined();
    expect(buttonNamed(wrapper, 'Clear all')).toBeDefined();
  });

  it('shows no bus actions in slot-only mode', async () => {
    const wrapper = attach(NotificationCenterGroup, { slots: { default: () => 'Custom row' } });
    await settle();
    expect(buttonNamed(wrapper, 'Mark all read')).toBeUndefined();
    expect(buttonNamed(wrapper, 'Clear all')).toBeUndefined();
  });

  it('marks everything read and keeps the rows', async () => {
    const { bus, wrapper } = await centerWith([retained('One'), retained('Two')]);
    await click(buttonNamed(wrapper, 'Mark all read')!.element);
    expect(bus.notificationState().unreadCount).toBe(0);
    expect(rows(wrapper)).toHaveLength(2);
    expect(buttonNamed(wrapper, 'Mark all read')).toBeUndefined();
    expect(bus.retained()).toHaveLength(2);
  });

  it('clears the history, the live toasts and the panel, then returns focus to the panel', async () => {
    const bus = createFeedbackBus();
    feedbackHost(bus, { defaultDuration: Infinity });
    const wrapper = center({ bus });
    bus.notify(retained('One'));
    bus.notify(retained('Two'));
    await settle();
    expect(cards()).toHaveLength(2);
    const clear = buttonNamed(wrapper, 'Clear all')!;
    clear.element.focus();
    expect(document.activeElement).toBe(clear.element);
    await click(clear.element);
    expect(bus.retained()).toEqual([]);
    expect(bus.notificationState().unreadCount).toBe(0);
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain("You're all caught up.");
    expect(buttonNamed(wrapper, 'Clear all')).toBeUndefined();
    expect(buttonNamed(wrapper, 'Mark all read')).toBeUndefined();
    expect(cards()).toHaveLength(0);
    expect(document.activeElement).toBe(wrapper.element);
  });

  it('hides Clear all when canClear is false', async () => {
    const { wrapper } = await centerWith([retained('Kept')], { canClear: false });
    expect(buttonNamed(wrapper, 'Clear all')).toBeUndefined();
    expect(buttonNamed(wrapper, 'Mark all read')).toBeDefined();
    await wrapper.setProps({ canClear: true });
    expect(buttonNamed(wrapper, 'Clear all')).toBeDefined();
  });

  it('keeps host header actions before the bus actions and Close last', async () => {
    const bus = createFeedbackBus();
    bus.notify(retained('Kept'));
    const wrapper = attach(NotificationCenterGroup, {
      props: { bus, onClose: () => undefined },
      slots: { headerActions: () => 'Host action' },
    });
    await settle();
    const header = wrapper.get('header').element;
    const names = [...header.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Mark all read', 'Clear all', 'Close notifications']);
    const hostAction = [...header.querySelectorAll('*')].find((node) => node.textContent === 'Host action')!;
    const markRead = header.querySelector('button[aria-label="Mark all read"]')!;
    expect(hostAction.compareDocumentPosition(markRead) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('requests closing the center without deleting retained history', async () => {
    const close = vi.fn();
    const { bus, wrapper } = await centerWith([retained('Kept')], { onClose: close });
    await click(wrapper.get('[aria-label="Close notifications"]').element);
    expect(close).toHaveBeenCalledOnce();
    expect(bus.retained()).toHaveLength(1);
  });
});

describe('beside a toast host on the same bus', () => {
  it('replays retained notices only into the center and runs a row’s own action', async () => {
    const bus = createFeedbackBus();
    const action = vi.fn();
    bus.notify(retained('Download ready', { action: h('button', { type: 'button', onClick: action }, 'Download') }));
    feedbackHost(bus);
    const wrapper = center({ bus });
    await settle();
    expect(document.querySelector('[aria-label="Dismiss"]')).toBeNull();
    await click(wrapper.findAll('button').find((button) => button.text() === 'Download')!.element);
    expect(action).toHaveBeenCalledOnce();
    expect(bus.retained()).toHaveLength(1);
  });

  it('closes a toast while retaining its notice, then deletes it from the center', async () => {
    const bus = createFeedbackBus();
    feedbackHost(bus, { defaultDuration: Infinity });
    const wrapper = center({ bus });
    bus.notify(retained('Review required', { id: 'kept', tone: NoticeTone.Warning }));
    await settle();
    expect(wrapper.text()).toContain('Review required');
    await click(document.querySelector('[aria-label="Dismiss"]')!);
    expect(bus.retained()).toHaveLength(1);
    expect(cards()).toHaveLength(0);
    await click(wrapper.get('[aria-label="Delete notification"]').element);
    expect(bus.retained()).toEqual([]);
    expect(wrapper.text()).toContain("You're all caught up.");
  });

  it('shows a paused deadline notice in history, expires its action, and resumes only future pop-ups', async () => {
    vi.useFakeTimers();
    const bus = createFeedbackBus();
    feedbackHost(bus);
    const wrapper = center({ bus, canPause: true });
    const select = wrapper.get('select');
    await select.setValue('manual');
    bus.notify(retained('Removed', { expiresAtMs: Date.now() + 6000, action: h('button', 'Undo') }));
    bus.notify(
      retained('Saved', { action: h('button', 'Toast action'), historyAction: h('button', 'View saved record') }),
    );
    await settle();
    expect(cards()).toHaveLength(0);
    expect(wrapper.text()).toContain('Undo');
    expect(wrapper.text()).toContain('View saved record');
    expect(wrapper.text()).not.toContain('Toast action');
    vi.advanceTimersByTime(6000);
    await settle();
    expect(wrapper.text()).toContain('Removed');
    expect(wrapper.text()).not.toContain('Undo');
    await select.setValue('on');
    await settle();
    expect(cards()).toHaveLength(0);
    bus.notify(retained('New'));
    await settle();
    expect(cards()[0]?.textContent).toContain('New');
  });
});
