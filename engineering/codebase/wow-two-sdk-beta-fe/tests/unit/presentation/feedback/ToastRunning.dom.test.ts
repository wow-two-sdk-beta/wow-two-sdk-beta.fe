import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFeedbackBus, NoticePriority, NoticeTone } from '@src/feedback';
import Toast from '@src/presentation/feedback/toast/Toast.vue';
import { toastHost, ToastTimer } from '@src/presentation/feedback/toastHost';
import {
  attach,
  cards,
  fakeAnimations,
  feedbackHost,
  host,
  resetToasts,
  settle,
  stack,
  timers,
  useFakeClock,
} from './ToastHarness';

/*
 * A running operation on a toast: the card's progress bar, the host's clock while it runs and when it
 * completes, and the bus adapter that feeds it from `notify` and `track`.
 */

afterEach(resetToasts);

const bar = (root: ParentNode = document) => root.querySelector<HTMLElement>('[role="progressbar"]');
const fillOf = (root: ParentNode = document) => root.querySelector<HTMLElement>('[data-toast-running-fill]');

describe('toast progress bar', () => {
  const card = (props: Record<string, unknown>, slots: Record<string, string> = {}) =>
    attach(Toast, { props: { title: 'Uploading', ...props }, slots });

  it('appears with progress as a determinate bar named by the title, with a width that tracks the value', async () => {
    const wrapper = card({});
    expect(wrapper.find('[data-toast-running]').exists()).toBe(false);

    await wrapper.setProps({ progress: { value: 0.4 } });
    const progress = wrapper.get('[role="progressbar"]');
    expect(progress.attributes('aria-valuemin')).toBe('0');
    expect(progress.attributes('aria-valuemax')).toBe('1');
    expect(progress.attributes('aria-valuenow')).toBe('0.4');
    expect(progress.attributes('data-toast-running-mode')).toBe('determinate');
    expect(progress.attributes('aria-label')).toBeUndefined();
    expect(document.getElementById(progress.attributes('aria-labelledby')!)?.textContent).toBe('Uploading');
    const fill = wrapper.get<HTMLElement>('[data-toast-running-fill]');
    expect(fill.element.style.width).toBe('40%');
    expect(fill.classes()).toContain('motion-safe:transition-[width]');
    expect(fill.classes().join(' ')).not.toContain('animate-[indeterminate');

    await wrapper.setProps({ progress: { value: 0.8 } });
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0.8');
    expect(fillOf()!.style.width).toBe('80%');
  });

  it('uses max for the scale and shows the label as muted text that describes the bar', () => {
    const wrapper = card({ progress: { value: 3, max: 5, label: 'File 3 of 5' } });
    const progress = wrapper.get('[role="progressbar"]');
    expect(progress.attributes('aria-valuemax')).toBe('5');
    expect(progress.attributes('aria-valuenow')).toBe('3');
    expect(fillOf()!.style.width).toBe('60%');
    const label = wrapper.get('[data-toast-running-label]');
    expect(label.text()).toBe('File 3 of 5');
    expect(label.classes()).toContain('text-muted-foreground');
    expect(progress.attributes('aria-describedby')).toBe(label.attributes('id'));
  });

  it('clamps values outside the range and reads a bad max as 1', () => {
    // [value, max] → [aria-valuenow, aria-valuemax, fill width]
    const cases: Array<[number, number | undefined, string, string, string]> = [
      [2, undefined, '1', '1', '100%'],
      [-3, undefined, '0', '1', '0%'],
      [Infinity, 4, '4', '4', '100%'],
      [-Infinity, 4, '0', '4', '0%'],
      [0.5, 0, '0.5', '1', '50%'],
      [0.5, -2, '0.5', '1', '50%'],
      [0.5, Number.NaN, '0.5', '1', '50%'],
      [0.5, Infinity, '0.5', '1', '50%'],
    ];
    for (const [value, max, now, scale, width] of cases) {
      const wrapper = card({ progress: max === undefined ? { value } : { value, max } });
      const element = wrapper.get('[role="progressbar"]');
      const label = `value ${value}, max ${max}`;
      expect(element.attributes('aria-valuenow'), label).toBe(now);
      expect(element.attributes('aria-valuemax'), label).toBe(scale);
      expect(wrapper.get<HTMLElement>('[data-toast-running-fill]').element.style.width, label).toBe(width);
    }
  });

  it('treats a missing or NaN value as indeterminate, with a motion-safe sweep and a still fill otherwise', () => {
    for (const progress of [{}, { value: Number.NaN }, { label: 'Waiting' }]) {
      const wrapper = card({ progress });
      const element = wrapper.get('[role="progressbar"]');
      expect(element.attributes('aria-valuenow')).toBeUndefined();
      expect(element.attributes('aria-valuemax')).toBe('1');
      expect(element.attributes('data-toast-running-mode')).toBe('indeterminate');
      const fill = wrapper.get<HTMLElement>('[data-toast-running-fill]');
      expect(fill.element.style.width).toBe('');
      expect(fill.classes()).toContain('w-1/3');
      expect(fill.classes().join(' ')).toContain('motion-safe:animate-[indeterminate');
      expect(fill.classes()).not.toContain('animate-[indeterminate_1.4s_ease-in-out_infinite]');
    }
  });

  it('falls back to the label, then to a stock name, when the toast has no title', () => {
    const labelled = card({ title: undefined, progress: { label: 'Syncing' } }).get('[role="progressbar"]');
    expect(labelled.attributes('aria-labelledby')).toBeUndefined();
    expect(labelled.attributes('aria-label')).toBe('Syncing');
    expect(labelled.attributes('aria-describedby')).toBeUndefined();

    const bare = card({ title: undefined, progress: { value: 0.1 } }).get('[role="progressbar"]');
    expect(bare.attributes('aria-label')).toBe('Progress');
  });

  it('sits under the copy and above the actions, and draws a thinner bar when compact', () => {
    const wrapper = card(
      { description: 'Two files left', progress: { value: 0.5 } },
      { actions: '<button type="button">Cancel</button>' },
    );
    const description = wrapper.get('[data-toast-summary] .text-sm').element;
    const progress = wrapper.get('[data-toast-running]').element;
    const actions = wrapper.get('button:not([aria-label])').element;
    expect(description.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(progress.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(wrapper.get('[role="progressbar"]').classes()).toContain('h-1');

    const compact = card({ isCompact: true, progress: { value: 0.5 } });
    expect(compact.get('[role="progressbar"]').classes()).toContain('h-0.5');
    expect(compact.get('[role="progressbar"]').classes()).not.toContain('h-1');
  });
});

describe('running toasts on the host', () => {
  const pin = () => stack().querySelector<HTMLButtonElement>('[aria-label="Pin notification"]');
  const seconds = () => timers('seconds')[0]?.textContent;

  it('stay up with no countdown, timer or Pin while the operation runs', async () => {
    useFakeClock();
    const wrapper = host({ timer: ToastTimer.Seconds, canPauseOnHover: false, defaultDuration: 3000 });
    const dismissed = vi.fn();
    const id = toastHost.toast({ title: 'Uploading', progress: { value: 0.2 }, onDismiss: dismissed });
    await settle();
    expect(seconds()).toBeUndefined();
    expect(pin()).toBeNull();
    expect(wrapper.findAllComponents(Toast)[0]!.props('progress')).toEqual({ value: 0.2 });

    await vi.advanceTimersByTimeAsync(10_000);
    toastHost.update(id, { progress: { value: 0.8 } });
    await settle();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(dismissed).not.toHaveBeenCalled();
    expect(wrapper.findAllComponents(Toast)[0]!.props('progress')).toEqual({ value: 0.8 });
    expect(seconds()).toBeUndefined();
  });

  it('drops a pin while running and starts a fresh countdown at the full duration on completion', async () => {
    useFakeClock();
    host({ timer: ToastTimer.Seconds, canPauseOnHover: false, defaultDuration: 3000 });
    const dismissed = vi.fn();
    const id = toastHost.toast({ title: 'Upload queued', onDismiss: dismissed });
    await settle();
    pin()!.click();
    await settle();
    expect(pin()?.getAttribute('aria-pressed')).toBe('true');

    toastHost.update(id, { progress: { value: 0.5 } });
    await settle();
    expect(pin()).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);

    toastHost.update(id, { title: 'Uploaded', progress: undefined });
    await settle();
    expect(seconds()).toBe('3s');
    expect(pin()?.getAttribute('aria-pressed')).toBe('false');
    await vi.advanceTimersByTimeAsync(2900);
    expect(dismissed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('highlights the card on completion, never on a progress update', async () => {
    const { highlights } = fakeAnimations();
    host();
    const id = toastHost.toast({ title: 'Uploading', progress: { value: 0.1 } });
    await settle();
    toastHost.update(id, { progress: { value: 0.6, label: 'File 3 of 5' } });
    await settle();
    expect(highlights()).toBe(0);
    toastHost.update(id, { progress: undefined });
    await settle();
    expect(highlights()).toBe(1);
  });
});

describe('bus-fed toast progress', () => {
  it('maps progress onto the toast options, clears it on settle, and keeps a running group sticky', async () => {
    const bus = createFeedbackBus();
    feedbackHost(bus);
    let entries: ReadonlyArray<{ id: string; progress?: unknown; duration?: number }> = [];
    const stop = toastHost.subscribe((items) => (entries = items));
    const progress = { value: 0.3, max: 2, label: 'Step 1' };
    bus.notify({ id: 'solo', tone: NoticeTone.Info, title: 'Solo', progress });
    await settle();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.progress).toEqual(progress);
    const id = entries[0]!.id;

    bus.notify({ id: 'solo', tone: NoticeTone.Success, title: 'Solo done' });
    await settle();
    expect(entries.map((entry) => entry.id)).toEqual([id]);
    expect(entries[0]!.progress).toBeUndefined();

    const group = { key: 'batch', title: 'Batch' };
    const groupCard = () => entries.find((entry) => entry.id !== id)!;
    bus.notify({ id: 'g1', tone: NoticeTone.Info, title: 'One', group, progress: { value: 0.1 } });
    bus.notify({ id: 'g2', tone: NoticeTone.Info, title: 'Two', group, progress: {} });
    await settle();
    expect(groupCard().progress).toBeUndefined();
    expect(groupCard().duration).toBe(Infinity);
    bus.notify({ id: 'g1', tone: NoticeTone.Success, title: 'One', group });
    await settle();
    expect(groupCard().duration).toBe(Infinity);
    bus.notify({ id: 'g2', tone: NoticeTone.Success, title: 'Two', group });
    await settle();
    expect(groupCard().duration).toBeUndefined();
    stop();
  });

  it('updates the same card as bus.track reports progress and then settles', async () => {
    const bus = createFeedbackBus();
    feedbackHost(bus);
    let finish: (value: string) => void = () => undefined;
    let report: (progress: { value?: number; label?: string }) => void = () => undefined;
    const done = bus.track<string>(
      (next) => {
        report = next;
        return new Promise<string>((resolve) => (finish = resolve));
      },
      {
        running: { tone: NoticeTone.Info, title: 'Syncing', progress: { label: 'Starting' } },
        success: { tone: NoticeTone.Success, title: 'Synced' },
        failure: { tone: NoticeTone.Danger, title: 'Sync failed' },
      },
    );
    await settle();
    const id = cards()[0]!.getAttribute('data-toast-id');
    expect(bar(cards()[0])?.getAttribute('data-toast-running-mode')).toBe('indeterminate');

    report({ value: 0.6, label: 'Almost there' });
    await settle();
    expect(cards()).toHaveLength(1);
    expect(bar(cards()[0])?.getAttribute('aria-valuenow')).toBe('0.6');
    expect(cards()[0]!.textContent).toContain('Almost there');

    finish('ok');
    await done;
    await settle();
    expect(cards()).toHaveLength(1);
    expect(cards()[0]!.getAttribute('data-toast-id')).toBe(id);
    expect(cards()[0]!.textContent).toContain('Synced');
    expect(cards()[0]!.querySelector('[data-toast-running]')).toBeNull();
  });

  it('shows each grouped row’s progress, keeps the card up while one runs, and releases it after', async () => {
    useFakeClock();
    const bus = createFeedbackBus();
    feedbackHost(bus, { priorityDurations: { [NoticePriority.Normal]: 1000 }, canPauseOnHover: false });
    const group = { key: 'uploads', title: 'Uploads' };
    const running = (id: string, title: string, value: number) =>
      bus.notify({ id, tone: NoticeTone.Info, title, group, progress: { value, label: `${value * 100}%` } });
    running('a', 'Uploading a.csv', 0.25);
    running('b', 'Uploading b.csv', 0.5);
    await settle();
    expect(cards()).toHaveLength(1);
    expect(bar(cards()[0])).toBeNull();

    // An open disclosure holds the clock, so each stretch of waiting below runs with it closed.
    const toggle = async () => {
      cards()[0]!.querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
      await settle();
    };
    const rowOf = (id: string) => document.querySelector<HTMLElement>(`[data-toast-group-row="${id}"]`)!;

    await toggle();
    const rows = [...document.querySelectorAll<HTMLElement>('[data-toast-group-row]')];
    expect(rows.map((row) => row.getAttribute('data-toast-group-row'))).toEqual(['b', 'a']);
    const rowBar = bar(rowOf('a'))!;
    expect(rowBar.getAttribute('aria-valuenow')).toBe('0.25');
    expect(rowBar.classList.contains('h-0.5')).toBe(true);
    expect(document.getElementById(rowBar.getAttribute('aria-labelledby')!)?.textContent).toBe('Uploading a.csv');
    expect(rowOf('b').textContent).toContain('50%');
    await toggle();

    await vi.advanceTimersByTimeAsync(5000);
    expect(cards()).toHaveLength(1);

    bus.notify({ id: 'a', tone: NoticeTone.Success, title: 'Uploaded a.csv', group });
    await settle();
    await vi.advanceTimersByTimeAsync(5000);
    expect(cards()).toHaveLength(1);
    await toggle();
    expect(bar(rowOf('a'))).toBeNull();
    expect(bar(rowOf('b'))).not.toBeNull();
    await toggle();

    bus.notify({ id: 'b', tone: NoticeTone.Success, title: 'Uploaded b.csv', group });
    await settle();
    await vi.advanceTimersByTimeAsync(1100);
    expect(cards()).toHaveLength(0);
  });
});
