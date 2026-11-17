import { afterEach, describe, expect, it, vi } from 'vitest';
import { NoticePriority } from '@src/feedback';
import { toastHost } from '@src/presentation/feedback/toastHost';
import { card, cards, host, overflowButton, press, resetToasts, settle, stack, useFakeClock } from './ToastHarness';

/*
 * What the stack holds and in which order: priority order, the collapsed window and its overflow list, the
 * details disclosure, and the `toastHost` store contract underneath. The anchor end of the stack is the first
 * card in the DOM — a bottom position reverses the flex direction, not the node order. happy-dom has no layout:
 * the height fit stubs card heights and gives the stack an inline `max-height`, which its computed style reports.
 */

afterEach(resetToasts);

const titles = () => cards().map((node) => node.querySelector('[data-toast-summary] .font-medium')?.textContent);
const disclosure = () => stack().querySelector<HTMLButtonElement>('button[aria-controls]');

describe('toast stack order', () => {
  it('puts urgent before high, normal and low, keeping delivery order on ties', async () => {
    host({ max: 6 });
    toastHost.toast({ title: 'Low', priority: NoticePriority.Low });
    toastHost.toast({ title: 'Unclassified' });
    toastHost.toast({ title: 'Urgent', priority: NoticePriority.Urgent });
    toastHost.toast({ title: 'High', priority: NoticePriority.High });
    toastHost.toast({ title: 'Normal', priority: NoticePriority.Normal });
    toastHost.toast({ title: 'Second urgent', priority: NoticePriority.Urgent });
    await settle();
    expect(titles()).toEqual(['Urgent', 'Second urgent', 'High', 'Unclassified', 'Normal', 'Low']);
  });

  it('keeps the same node order at a bottom anchor', async () => {
    host({ position: 'bottom-left' });
    toastHost.toast({ title: 'Low', priority: NoticePriority.Low });
    toastHost.toast({ title: 'High', priority: NoticePriority.High });
    await settle();
    expect(document.querySelector('[data-toast-position="bottom-left"]')).not.toBeNull();
    expect(titles()).toEqual(['High', 'Low']);
  });

  it('fills the collapsed window with the highest priorities', async () => {
    host({ max: 2 });
    toastHost.toast({ title: 'Low', priority: NoticePriority.Low });
    toastHost.toast({ title: 'Normal' });
    toastHost.toast({ title: 'High', priority: NoticePriority.High });
    await settle();
    expect(titles()).toEqual(['High', 'Normal']);
    toastHost.toast({ title: 'Urgent', priority: NoticePriority.Urgent });
    await settle();
    expect(titles()).toEqual(['Urgent', 'High']);
  });

  it('moves a card when an update changes its priority', async () => {
    host();
    toastHost.toast({ title: 'First' });
    const id = toastHost.toast({ title: 'Second' });
    await settle();
    toastHost.update(id, { priority: NoticePriority.High });
    await settle();
    expect(titles()).toEqual(['Second', 'First']);
  });
});

describe('toast overflow', () => {
  it('collapses the cards beyond max behind a "Show N more" control', async () => {
    host({ max: 2 });
    for (const title of ['One', 'Two', 'Three', 'Four']) toastHost.toast({ title });
    await settle();
    expect(cards()).toHaveLength(2);
    expect(overflowButton()?.textContent).toContain('Show 2 more notifications');
    expect(overflowButton()?.getAttribute('aria-expanded')).toBe('false');
  });

  it('fits the collapsed window to the available height', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.toastId ? 100 : 0;
    });
    host();
    for (const title of ['One', 'Two', 'Three']) toastHost.toast({ title });
    await settle();
    expect(overflowButton()).toBeNull();
    // 3 cards and 2 gaps need 316px; 260px holds the 36px control and two cards.
    stack().style.maxHeight = '260px';
    window.dispatchEvent(new Event('resize'));
    await settle();
    expect(cards()).toHaveLength(2);
    expect(overflowButton()?.textContent).toContain('Show 1 more notifications');
  });

  it('opens on the first hidden card, holds ordinary clocks while deadlines run, and closes on Escape', async () => {
    useFakeClock();
    host({ max: 2, canPauseOnHover: false, defaultDuration: 3000 });
    const ordinary = vi.fn();
    const deadline = vi.fn();
    for (const title of ['One', 'Two', 'Three']) toastHost.toast({ title, onDismiss: ordinary });
    toastHost.toast({ title: 'Undo', expiresAtMs: Date.now() + 2000, onDismiss: deadline });
    await settle();

    overflowButton()!.click();
    await settle();
    expect(stack().hasAttribute('data-toast-expanded')).toBe(true);
    expect(overflowButton()?.getAttribute('aria-expanded')).toBe('true');
    expect(overflowButton()?.textContent).toContain('Show fewer notifications');
    expect(cards()).toHaveLength(4);
    expect(document.activeElement).toBe(card('Three'));

    await vi.advanceTimersByTimeAsync(5000);
    expect(deadline).toHaveBeenCalledOnce();
    expect(ordinary).not.toHaveBeenCalled();

    press('Escape');
    await settle();
    expect(stack().hasAttribute('data-toast-expanded')).toBe(false);
    expect(cards()).toHaveLength(2);
    expect(document.activeElement).toBe(overflowButton());
    await vi.advanceTimersByTimeAsync(3100);
    expect(ordinary).toHaveBeenCalledTimes(2);
  });

  it('closes from its own control, leaving Escape to the page while collapsed', async () => {
    host({ max: 1 });
    toastHost.toast({ title: 'One' });
    toastHost.toast({ title: 'Two' });
    await settle();
    const outside = vi.fn();
    document.body.addEventListener('keydown', outside);
    overflowButton()!.focus();
    press('Escape');
    expect(outside).toHaveBeenCalledOnce();

    overflowButton()!.click();
    await settle();
    press('Escape');
    expect(outside).toHaveBeenCalledOnce();
    await settle();

    overflowButton()!.click();
    await settle();
    overflowButton()!.click();
    await settle();
    expect(stack().hasAttribute('data-toast-expanded')).toBe(false);
    expect(document.activeElement).toBe(overflowButton());
    document.body.removeEventListener('keydown', outside);
  });

  it('lists compact copy in the overflow rows, and the full copy for a card without it', async () => {
    host({ max: 1 });
    toastHost.toast({
      title: 'Upload finished for quarterly-report-final.pdf',
      description: 'Stored in Finance › Reports.',
      compact: { title: 'Upload finished' },
    });
    toastHost.toast({ title: 'Sync complete', description: 'All 12 folders are up to date.' });
    await settle();
    expect(card('quarterly-report-final.pdf')?.textContent).toContain('Stored in Finance');

    overflowButton()!.click();
    await settle();
    const [compact, full] = cards();
    expect(compact!.querySelector('[data-toast-compact]')).not.toBeNull();
    expect(compact!.textContent).toContain('Upload finished');
    expect(compact!.textContent).not.toContain('quarterly-report-final.pdf');
    expect(compact!.textContent).not.toContain('Stored in Finance');
    expect(full!.querySelector('[data-toast-compact]')).not.toBeNull();
    expect(full!.textContent).toContain('Sync complete');
    expect(full!.textContent).toContain('All 12 folders are up to date.');

    overflowButton()!.click();
    await settle();
    expect(cards()[0]!.textContent).toContain('quarterly-report-final.pdf');
    expect(cards()[0]!.querySelector('[data-toast-compact]')).toBeNull();
  });
});

describe('toast details disclosure', () => {
  it('holds an ordinary clock while the details are open', async () => {
    useFakeClock();
    host({ canPauseOnHover: false });
    const dismissed = vi.fn();
    toastHost.toast({
      title: 'Import failed',
      details: 'Row 14: missing email.',
      duration: 2000,
      onDismiss: dismissed,
    });
    await settle();
    disclosure()!.click();
    await settle();
    expect(disclosure()!.getAttribute('aria-expanded')).toBe('true');
    expect(stack().textContent).toContain('Row 14: missing email.');
    await vi.advanceTimersByTimeAsync(5000);
    expect(dismissed).not.toHaveBeenCalled();

    disclosure()!.click();
    await settle();
    await vi.advanceTimersByTimeAsync(2100);
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('forgets an open disclosure once its toast has no details', async () => {
    useFakeClock();
    host({ canPauseOnHover: false });
    const dismissed = vi.fn();
    const id = toastHost.toast({ title: 'Syncing', details: 'Step 1 of 3', duration: 2000, onDismiss: dismissed });
    await settle();
    disclosure()!.click();
    await settle();
    toastHost.update(id, { details: undefined });
    await settle();
    toastHost.update(id, { title: 'Sync failed', details: 'Step 2 of 3 timed out.' });
    await settle();
    expect(disclosure()!.getAttribute('aria-expanded')).toBe('false');
    await vi.advanceTimersByTimeAsync(2100);
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('keeps the details open while the card plays its exit', async () => {
    host();
    const id = toastHost.toast({ title: 'Import failed', details: 'Row 14: missing email.' });
    await settle();
    disclosure()!.click();
    await settle();
    toastHost.dismiss(id);
    await settle();
    const leaving = stack().querySelector('[data-toast-exiting]');
    expect(leaving?.querySelector('button[aria-controls]')?.getAttribute('aria-expanded')).toBe('true');
    expect(leaving?.textContent).toContain('Row 14: missing email.');
  });
});

describe('toastHost store', () => {
  it('does not retain an exit for a toast dismissed before it mounts', async () => {
    host();
    toastHost.dismiss(toastHost.toast({ title: 'Already complete' }));
    await settle();
    expect(stack()).toBeNull();
  });

  it('returns the complete promise settlement chain, so formatter errors are observable', async () => {
    const failure = new Error('format failed');
    const formatted = toastHost.promise(Promise.resolve(4), {
      loading: 'Loading',
      success: () => {
        throw failure;
      },
      error: 'Failed',
    });
    await expect(formatted).rejects.toBe(failure);
    const reason = new Error('network');
    await expect(
      toastHost.promise(Promise.reject(reason), { loading: 'Loading', success: 'Saved', error: 'Failed' }),
    ).rejects.toBe(reason);
  });

  it('notifies subscribers of a removal even when its dismiss callback throws', () => {
    const lengths: number[] = [];
    const unsubscribe = toastHost.subscribe((items) => lengths.push(items.length));
    const id = toastHost.toast({
      onDismiss: () => {
        throw new Error('callback');
      },
    });
    expect(() => toastHost.dismiss(id)).toThrow('callback');
    expect(lengths.at(-1)).toBe(0);
    unsubscribe();
  });
});
