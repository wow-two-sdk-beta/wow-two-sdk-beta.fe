import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createFeedbackBus, NoticePriority, NoticeTone } from '@src/feedback';
import { LocaleProvider } from '@src/foundation/i18n';
import { ToastHost, toastHost } from '@src/presentation/feedback/toastHost';
import {
  attach,
  card,
  cards,
  feedbackHost,
  host,
  press,
  resetToasts,
  settle,
  stack,
  useFakeClock,
} from './ToastHarness';

/*
 * What assistive technology and the keyboard get from the stack: the named landmark, the focus hotkey and
 * the way back out, where focus goes when the focused card leaves, and the two live regions.
 */

afterEach(resetToasts);

/** A focused control outside the stack — where the reader was working. */
const workspace = (tag = 'button') => {
  const element = document.createElement(tag);
  document.body.append(element);
  element.focus();
  return element;
};

describe('toast stack landmark', () => {
  it('exposes the stack as a named region only while a toast shows', async () => {
    host();
    await settle();
    expect(document.querySelector('[role="region"]')).toBeNull();

    toastHost.toast({ title: 'Saved' });
    await settle();
    const regions = document.querySelectorAll('[role="region"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]!.textContent).toContain('Saved');
  });

  it('names the stack with its hotkey', async () => {
    const wrapper = host();
    toastHost.toast({ title: 'Saved' });
    await settle();
    expect(stack().getAttribute('aria-label')).toBe('Notifications (F8)');
    await wrapper.setProps({ hotkey: 'F6' });
    await settle();
    expect(stack().getAttribute('aria-label')).toBe('Notifications (F6)');
    press('F6');
    expect(document.activeElement).toBe(cards()[0]);
    await wrapper.setProps({ hotkey: false });
    await settle();
    expect(stack().getAttribute('aria-label')).toBe('Notifications');
  });

  it('localizes the region name', async () => {
    attach(
      defineComponent({
        render: () =>
          h(LocaleProvider, { messages: { 'ToastHost.notifications': 'Bildirishnomalar' } }, () =>
            h(ToastHost, { defaultDuration: 5000 }),
          ),
      }),
    );
    toastHost.toast({ title: 'Saqlandi' });
    await settle();
    expect(stack().getAttribute('aria-label')).toBe('Bildirishnomalar (F8)');
  });
});

describe('toast hotkey', () => {
  it('focuses the card nearest the anchor on F8 and returns focus on Escape', async () => {
    const origin = workspace();
    host();
    toastHost.toast({ title: 'First' });
    toastHost.toast({ title: 'Second' });
    await settle();

    expect(press('F8').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cards()[0]);
    press('Escape');
    expect(document.activeElement).toBe(origin);
    // Escape with nothing remembered leaves focus where it is.
    cards()[1]!.focus();
    press('Escape');
    expect(document.activeElement).toBe(cards()[1]);
  });

  it('hands focus back to the page on Escape when F8 was pressed with nothing focused', async () => {
    host();
    toastHost.toast({ title: 'Only' });
    await settle();
    (document.activeElement as HTMLElement | null)?.blur();

    press('F8', document.body);
    expect(document.activeElement).toBe(cards()[0]);
    press('Escape');
    expect(document.activeElement).toBe(document.body);
  });

  it('collapses an open overflow list on the first Escape and returns focus on the next', async () => {
    const origin = workspace();
    host({ max: 1 });
    toastHost.toast({ title: 'First' });
    toastHost.toast({ title: 'Second' });
    await settle();
    press('F8');
    const overflow = document.querySelector<HTMLButtonElement>('[data-toast-overflow]')!;
    overflow.click();
    await settle();
    expect(overflow.getAttribute('aria-expanded')).toBe('true');

    press('Escape');
    await settle();
    expect(overflow.getAttribute('aria-expanded')).toBe('false');
    expect(stack().contains(document.activeElement)).toBe(true);
    press('Escape');
    expect(document.activeElement).toBe(origin);
  });

  it('returns focus when the last card leaves', async () => {
    const origin = workspace();
    host();
    toastHost.toast({ title: 'Only' });
    await settle();
    press('F8');
    expect(document.activeElement).toBe(cards()[0]);
    toastHost.dismissAll();
    await settle();
    expect(document.activeElement).toBe(origin);
  });

  it('stays out of text fields, leaves the key alone with no toasts, and switches off with false', async () => {
    const field = workspace('input');
    const wrapper = host();
    expect(press('F8').defaultPrevented).toBe(false);
    toastHost.toast({ title: 'Saved' });
    await settle();
    press('F8');
    expect(document.activeElement).toBe(field);

    workspace();
    await wrapper.setProps({ hotkey: false });
    await settle();
    expect(press('F8').defaultPrevented).toBe(false);
    expect(stack().contains(document.activeElement)).toBe(false);
  });
});

describe('focus after a card leaves', () => {
  it.each([
    { name: 'moves to the next card that stays', titles: ['One', 'Two', 'Three'], closed: 'One', next: 'Two' },
    {
      name: 'falls back to the previous card when the last one closes',
      titles: ['One', 'Two'],
      closed: 'Two',
      next: 'One',
    },
  ])('$name', async ({ titles, closed, next }) => {
    host();
    for (const title of titles) toastHost.toast({ title });
    await settle();
    const close = card(closed)!.querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!;
    close.focus();
    close.click();
    await settle();
    expect(stack().querySelector('[data-toast-exiting]')?.textContent).toContain(closed);
    expect(document.activeElement).toBe(card(next));
  });

  it('stays on the card when the control it held leaves with a group member', async () => {
    const bus = createFeedbackBus();
    feedbackHost(bus, { defaultDuration: Infinity });
    const notifyImport = (title: string) =>
      bus.notify({
        tone: NoticeTone.Info,
        title,
        group: { key: 'imports', title: 'Imports' },
        action: h('button', { type: 'button', 'data-row-action': title }, `Open ${title}`),
      });
    const first = notifyImport('contacts.csv');
    notifyImport('deals.csv');
    await settle();
    stack().querySelector<HTMLButtonElement>('button[aria-controls]')!.click();
    await settle();
    document.querySelector<HTMLButtonElement>('[data-row-action="contacts.csv"]')!.focus();
    bus.dismiss(first);
    await settle();
    await settle();
    expect(cards()).toHaveLength(1);
    expect(stack().querySelector('button[aria-controls]')).toBeNull();
    expect(document.activeElement).toBe(cards()[0]);
  });
});

describe('toast announcements', () => {
  beforeEach(() => useFakeClock({ frames: true }));

  const region = (politeness: 'polite' | 'assertive') =>
    document.querySelector<HTMLElement>(`[data-toast-announcer="${politeness}"]`)!;
  const said = (politeness: 'polite' | 'assertive' = 'polite') => region(politeness).textContent?.trim() ?? '';
  /** Waits out the 120 ms batch and the frames a region stays empty for. */
  const speak = () => vi.advanceTimersByTimeAsync(200);

  it('reads ordinary toasts politely and danger or urgent ones assertively', async () => {
    host({ defaultDuration: 60_000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(region('polite').getAttribute('role')).toBe('status');
    expect(region('assertive').getAttribute('role')).toBe('alert');

    toastHost.toast({ title: 'Saved', description: 'Your file is safe.' });
    await speak();
    expect(said()).toBe('Saved. Your file is safe.');
    expect(said('assertive')).toBe('');

    toastHost.toast({ title: 'Upload failed', severity: 'danger' });
    await speak();
    expect(said('assertive')).toBe('Upload failed');
    toastHost.toast({ title: 'Undo delete?', priority: NoticePriority.Urgent });
    await speak();
    expect(said('assertive')).toBe('Undo delete?');
  });

  it('batches close arrivals, and reads more than three as a count plus the most important one', async () => {
    host({ defaultDuration: 60_000 });
    toastHost.toast({ title: 'One' });
    toastHost.toast({ title: 'Two' });
    await speak();
    expect(said()).toBe('One. Two');

    for (const title of ['Three', 'Four', 'Five']) toastHost.toast({ title });
    toastHost.toast({ title: 'Deploy finished', priority: NoticePriority.High });
    await speak();
    expect(said()).toBe('4 new notifications. Deploy finished');
  });

  it('reads identical text again by clearing the region first', async () => {
    host({ defaultDuration: 60_000 });
    toastHost.toast({ title: 'Saved' });
    await speak();
    expect(said()).toBe('Saved');
    toastHost.toast({ title: 'Saved' });
    await vi.advanceTimersByTimeAsync(125);
    expect(said()).toBe('');
    await vi.advanceTimersByTimeAsync(75);
    expect(said()).toBe('Saved');
  });

  it('reads an in-place change and a group’s growth', async () => {
    host({ defaultDuration: 60_000 });
    const id = toastHost.toast({ title: 'Deploying' });
    await speak();
    toastHost.update(id, { title: 'Deploy failed', severity: 'danger' });
    await speak();
    expect(said('assertive')).toBe('Deploy failed');

    const group = toastHost.toast({ title: 'Pipeline runs', group: { count: 1, latest: { title: 'Run 1 queued' } } });
    await speak();
    toastHost.update(group, {
      description: '3 notifications',
      group: { count: 3, latest: { title: 'Run 3 queued' } },
    });
    await speak();
    expect(said()).toBe('Pipeline runs: 3 notifications. Run 3 queued');
  });

  it('stays silent through progress updates and speaks when the operation completes', async () => {
    host({ defaultDuration: 60_000 });
    const id = toastHost.toast({ title: 'Uploading', progress: { value: 0.1 } });
    await speak();
    expect(said()).toBe('Uploading');
    toastHost.update(id, { progress: { value: 0.6, label: 'File 3 of 5' } });
    await vi.advanceTimersByTimeAsync(125);
    expect(said()).toBe('Uploading');
    await speak();
    expect(said()).toBe('Uploading');

    toastHost.update(id, { progress: undefined });
    await vi.advanceTimersByTimeAsync(125);
    expect(said()).toBe('');
    await speak();
    expect(said()).toBe('Uploading');
  });

  it('skips toasts with no plain text', async () => {
    host({ defaultDuration: 60_000 });
    toastHost.toast({ content: h('div', 'Custom body') });
    toastHost.toast({ title: h('strong', 'Rich title') });
    await speak();
    expect(said()).toBe('');
    expect(said('assertive')).toBe('');
  });
});
