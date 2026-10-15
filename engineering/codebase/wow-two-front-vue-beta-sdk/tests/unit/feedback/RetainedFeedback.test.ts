import { describe, expect, it, vi } from 'vitest';
import { createFeedbackBus, NoticeCategory, NoticeTone } from '@src/feedback';

describe('retained feedback scope', () => {
  it('explicitly hydrates validated snapshots without replay or generated-id collision', () => {
    const bus = createFeedbackBus({ initialRetained: [{ id: 'n_1', title: 'Earlier', tone: NoticeTone.Info }] });
    const published = vi.fn();
    bus.subscribe(published);
    expect(bus.retained()[0]?.category).toBe(NoticeCategory.Retained);
    expect(published).not.toHaveBeenCalled();
    expect(bus.notify({ title: 'New', tone: NoticeTone.Info })).toBe('n_2');
    expect(bus.retained()[0]?.title).toBe('Earlier');
  });
  it('retains only explicit retained notices, even when transient notices have infinite duration', () => {
    const bus = createFeedbackBus();
    bus.notify({ title: 'Toast only', tone: NoticeTone.Info, durationMs: Infinity });
    bus.notify({ title: 'Keep this', tone: NoticeTone.Warning, category: NoticeCategory.Retained, id: 'keep' });
    expect(bus.retained().map((notice) => notice.id)).toEqual(['keep']);
    expect(Object.isFrozen(bus.retained())).toBe(true);
    expect(Object.isFrozen(bus.retained()[0])).toBe(true);
  });

  it('replays retained history to a later subscriber and updates stable ids without duplicates', () => {
    const bus = createFeedbackBus();
    bus.notify({ title: 'Earlier', tone: NoticeTone.Warning, category: NoticeCategory.Retained, id: 'keep' });
    const snapshot = vi.fn();
    const unsubscribe = bus.subscribeRetained(snapshot);
    expect(snapshot.mock.calls[0]?.[0][0].title).toBe('Earlier');
    bus.notify({ title: 'Updated', tone: NoticeTone.Success, category: NoticeCategory.Retained, id: 'keep' });
    expect(bus.retained()).toHaveLength(1);
    expect(bus.retained()[0]?.title).toBe('Updated');
    unsubscribe();
    bus.remove('keep');
    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('deletes only retained ids and orders new notices newest-first', () => {
    const bus = createFeedbackBus();
    const dismiss = vi.fn();
    bus.subscribeDismiss(dismiss);
    for (const id of ['first', 'second'])
      bus.notify({ id, title: id, tone: NoticeTone.Info, category: NoticeCategory.Retained });
    expect(bus.retained().map((notice) => notice.id)).toEqual(['second', 'first']);
    bus.remove('missing');
    expect(dismiss).not.toHaveBeenCalled();
    bus.remove('first');
    expect(bus.retained().map((notice) => notice.id)).toEqual(['second']);
    expect(dismiss).toHaveBeenCalledWith('first');
  });

  it('drops an old retained entry when its stable id is published as transient', () => {
    const bus = createFeedbackBus();
    bus.notify({ id: 'same', title: 'Kept', tone: NoticeTone.Info, category: NoticeCategory.Retained });
    bus.notify({ id: 'same', title: 'Transient', tone: NoticeTone.Success });
    expect(bus.retained()).toEqual([]);
  });

  it('resets one bus without changing another, keeps subscriptions, and safely disposes them', () => {
    const first = createFeedbackBus();
    const second = createFeedbackBus();
    const dismiss = vi.fn();
    const notices = vi.fn();
    first.subscribeDismiss(dismiss);
    first.subscribe(notices);
    first.subscribeRetained(() => {
      throw new Error('observer');
    });
    first.subscribeDismiss(() => {
      throw new Error('observer');
    });
    for (const bus of [first, second])
      bus.notify({ title: 'Kept', tone: NoticeTone.Info, category: NoticeCategory.Retained });
    expect(() => first.reset()).not.toThrow();
    expect(first.retained()).toEqual([]);
    expect(second.retained()).toHaveLength(1);
    expect(dismiss).toHaveBeenCalledWith(null);
    first.notify({ title: 'New session', tone: NoticeTone.Info });
    expect(notices).toHaveBeenCalledTimes(2);
    first.dispose();
    first.notify({ title: 'Late delivery', tone: NoticeTone.Info, category: NoticeCategory.Retained });
    expect(notices).toHaveBeenCalledTimes(2);
    expect(first.retained()).toEqual([]);
    expect(() => first.dispose()).not.toThrow();
  });
});
