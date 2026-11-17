import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createFeedbackBus, NoticeCategory, NoticePriority, NoticeTone } from '@src/feedback';
import NotificationCenterGroup from '@src/presentation/display/notificationCenterGroup/NotificationCenterGroup.vue';
import { toastHost } from '@src/presentation/feedback/toastHost';
import { attach, cards, click, feedbackHost, resetToasts, settle, stack } from './ToastHarness';

/*
 * The bus adapter: how `FeedbackToastHost` turns published notices into toasts — placement, grouping, the
 * retained notice's Delete and Remind later, the pause bypass, and its subscription to one bus at a time.
 */

afterEach(resetToasts);

const retained = { tone: NoticeTone.Info, category: NoticeCategory.Retained } as const;

describe('bus-fed toasts', () => {
  it('forwards placement and offers Pin on ordinary timed notices', async () => {
    const bus = createFeedbackBus();
    feedbackHost(bus, { position: 'bottom-right' });
    bus.notify({ title: 'Saved', tone: NoticeTone.Success });
    await settle();
    expect(stack().getAttribute('data-toast-position')).toBe('bottom-right');
    expect(stack().classList.contains('bottom-(--toast-bottom-inset)')).toBe(true);
    expect(stack().classList.contains('right-(--toast-right-inset)')).toBe(true);
    expect(stack().classList.contains('flex-col-reverse')).toBe(true);
    expect(stack().querySelector('[aria-label="Pin notification"]')).not.toBeNull();
    expect(stack().querySelector('[data-toast-icon]')).not.toBeNull();
    expect(stack().querySelector('[aria-label="Delete notification"]')).toBeNull();
  });

  it('merges notices sharing a group key into one card whose rows keep their own action and identity', async () => {
    const bus = createFeedbackBus();
    feedbackHost(bus);
    const openFirst = vi.fn();
    const openSecond = vi.fn();
    const base = { ...retained, tone: NoticeTone.Success, group: { key: 'runs:queued', title: 'Runs queued' } };
    const runOne = { ...base, id: 'a1', action: h('button', { onClick: openFirst }, 'Open run one') };
    bus.notify({ ...runOne, title: 'Run one' });
    bus.notify({
      ...base,
      id: 'a2',
      title: 'Run two',
      compact: { title: 'Run #2' },
      action: h('button', { onClick: openSecond }, 'Open run two'),
    });
    bus.notify({ ...runOne, title: 'Run one updated' });
    await settle();
    expect(cards()).toHaveLength(1);
    const card = cards()[0]!;
    expect(card.textContent).toContain('Runs queued');
    expect(card.textContent).toContain('2 notifications');
    expect(card.querySelectorAll('[data-toast-details] li')).toHaveLength(0);

    await click(card.querySelector('button[aria-expanded]')!);
    const rows = card.querySelectorAll('[data-toast-details] li');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute('data-toast-group-row')).toBe('a2');
    expect(rows[0]?.textContent).toContain('Run #2');
    await click(rows[0]!.querySelector('button')!);
    expect(openSecond).toHaveBeenCalledOnce();
    expect(openFirst).not.toHaveBeenCalled();

    bus.remove('a1');
    await settle();
    expect(card.textContent).toContain('Run two');
    expect(card.textContent).not.toContain('Run one updated');
    expect(bus.retained().map((notice) => notice.id)).toEqual(['a2']);
  });

  it('deletes a retained notice directly from its toast, and shows one toast per stable id', async () => {
    const bus = createFeedbackBus();
    feedbackHost(bus, { defaultDuration: Infinity });
    attach(NotificationCenterGroup, { props: { bus } });
    bus.notify({ ...retained, id: 'same', title: 'Original' });
    bus.notify({ ...retained, id: 'same', title: 'Updated', tone: NoticeTone.Success });
    await settle();
    expect(document.querySelectorAll('[aria-label="Dismiss"]')).toHaveLength(1);
    expect(bus.retained()).toHaveLength(1);
    expect(document.body.textContent).not.toContain('Original');
    await click(stack().querySelector('[aria-label="Delete notification"]')!);
    expect(bus.retained()).toEqual([]);
    expect(cards()).toHaveLength(0);
  });

  it('offers a retry when reminder scheduling fails and preserves history on success', async () => {
    const schedule = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
    const bus = createFeedbackBus({ reminders: { delayMs: 5000, schedule } });
    feedbackHost(bus);
    bus.notify({ ...retained, id: 'review', title: 'Review due', reminderKey: 'draft:12', tone: NoticeTone.Warning });
    await settle();
    const card = cards()[0]!;
    const button = [...card.querySelectorAll('button')].find((el) => el.textContent?.includes('Remind later'))!;
    const start = Date.now();
    await click(button);
    await vi.waitFor(() => expect(card.textContent).toContain('Could not schedule the reminder. Try again.'));
    expect(schedule).toHaveBeenCalledOnce();
    const request = schedule.mock.calls[0]![0];
    expect(request).toMatchObject({ noticeId: 'review', key: 'draft:12' });
    expect(request.dueAtMs).toBeGreaterThanOrEqual(start + 5000);
    await click(button);
    await vi.waitFor(() => expect(cards()[0]?.textContent).toContain('Reminder scheduled.'));
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(bus.retained().map((notice) => notice.id)).toEqual(['review']);
  });

  it('lets a notice at the bus’s pauseBypass priority pop up during a pause and holds the rest', async () => {
    const bus = createFeedbackBus({ pauseBypass: NoticePriority.Urgent });
    feedbackHost(bus);
    bus.setToastPause('manual');
    bus.notify({ tone: NoticeTone.Info, title: 'Routine' });
    bus.notify({ tone: NoticeTone.Warning, title: 'Quota almost used', priority: NoticePriority.High });
    await settle();
    expect(cards()).toHaveLength(0);

    bus.notify({ tone: NoticeTone.Danger, title: 'Undo within 5 s', priority: NoticePriority.Urgent });
    await settle();
    expect(cards()).toHaveLength(1);
    expect(cards()[0]!.textContent).toContain('Undo within 5 s');
  });

  it('resets only its own toasts and unsubscribes on bus change or unmount', async () => {
    const first = createFeedbackBus();
    const second = createFeedbackBus();
    const host = feedbackHost(first, { defaultDuration: Infinity });
    const center = attach(NotificationCenterGroup, { props: { bus: first } });
    first.notify({ ...retained, title: 'Scoped' });
    toastHost.toast({ title: 'Unrelated', duration: Infinity });
    await settle();
    first.reset();
    await settle();
    expect(cards().map((toast) => toast.textContent)).toEqual(['Unrelated']);
    await host.setProps({ bus: second });
    await center.setProps({ bus: second });
    first.notify({ ...retained, title: 'Old scope' });
    second.notify({ ...retained, title: 'New scope' });
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
