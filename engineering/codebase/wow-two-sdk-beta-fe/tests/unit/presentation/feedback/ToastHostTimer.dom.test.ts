import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { NoticePriority } from '@src/feedback';
import { toastHost, ToastTimer, type ToastOptions } from '@src/presentation/feedback/toastHost';
import {
  bars,
  card,
  fakeAnimations,
  host,
  hover,
  resetToasts,
  settle,
  stack,
  timers,
  useFakeClock,
} from './ToastHarness';

/*
 * A toast's clock: which countdown display it gets and where it sits, the bar's animation, how long each
 * toast stays, Pin, and what holds the clock (hover, focus).
 */

afterEach(resetToasts);

const pinButton = () => stack().querySelector<HTMLButtonElement>('[aria-label="Pin notification"]');

describe('toast timer display', () => {
  it('is off by default', async () => {
    host();
    toastHost.toast({ title: 'Saved' });
    await settle();
    expect(document.querySelectorAll('[data-toast-timer], [data-toast-progress]')).toHaveLength(0);
  });

  it('draws a ring or counts seconds beside the close button, and a bar along the bottom', async () => {
    host({ timer: ToastTimer.Ring });
    toastHost.toast({ title: 'Ringed' });
    toastHost.toast({ title: 'Counted', timer: ToastTimer.Seconds });
    toastHost.toast({ title: 'Close ring', timer: ToastTimer.CloseRing });
    toastHost.toast({ title: 'Barred', timer: ToastTimer.Bar });
    toastHost.toast({ title: 'Plain', timer: ToastTimer.None });
    await settle();

    expect(timers('ring')).toHaveLength(1);
    expect(timers('seconds')).toHaveLength(1);
    expect(bars()).toHaveLength(1);
    expect(bars()[0]!.getAttribute('aria-hidden')).toBe('true');
    const ring = timers('ring')[0]!;
    expect(ring.getAttribute('aria-hidden')).toBe('true');
    expect(ring.parentElement!.nextElementSibling?.getAttribute('aria-label')).toBe('Dismiss');
    const closeRing = timers('closeRing')[0]!;
    expect(closeRing.closest('button')?.getAttribute('aria-label')).toBe('Dismiss');
    expect(closeRing.firstElementChild?.getAttribute('stroke-opacity')).toBe('0.22');
  });

  it('shows no display on sticky toasts, and the bar for custom content', async () => {
    host({ timer: ToastTimer.Seconds });
    toastHost.toast({ title: 'Sticky', duration: Infinity });
    toastHost.toast({ content: h('div', 'Custom body') });
    await settle();
    expect(timers('seconds')).toHaveLength(0);
    expect(bars()).toHaveLength(1);
  });

  it('counts whole seconds down, rounding up, and holds while the stack is hovered', async () => {
    useFakeClock();
    host({ timer: ToastTimer.Seconds, defaultDuration: 3000 });
    toastHost.toast({ title: 'Saved' });
    await settle();
    const seconds = () => timers('seconds')[0]?.textContent;

    expect(seconds()).toBe('3s');
    await vi.advanceTimersByTimeAsync(1100);
    expect(seconds()).toBe('2s');
    hover(true);
    await settle();
    await vi.advanceTimersByTimeAsync(5000);
    expect(seconds()).toBe('2s');
    hover(false);
    await settle();
    hover(true, 'touch');
    await vi.advanceTimersByTimeAsync(1000);
    expect(seconds()).toBe('1s');
  });

  it('starts a display swapped in mid-countdown from the time already spent', async () => {
    useFakeClock();
    const wrapper = host({ timer: ToastTimer.Ring, defaultDuration: 3000, canPauseOnHover: false });
    toastHost.toast({ title: 'Saved' });
    await settle();
    await vi.advanceTimersByTimeAsync(1100);
    await wrapper.setProps({ timer: ToastTimer.Seconds });
    await settle();
    expect(timers('ring')).toHaveLength(0);
    expect(timers('seconds')[0]?.textContent).toBe('2s');
  });
});

describe('toast countdown bar', () => {
  it('counts down over the resolved duration and pauses with the expiry timer', async () => {
    const { animate, created } = fakeAnimations();
    host({ timer: ToastTimer.Bar, defaultDuration: 2500 });
    toastHost.toast({ title: 'Material saved' });
    await settle();
    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.calls[0]![1]).toMatchObject({ duration: 2500, easing: 'linear', fill: 'forwards' });
    hover(true);
    await settle();
    expect(created[0]!.pause).toHaveBeenCalled();
    hover(false);
    await settle();
    expect(created[0]!.play).toHaveBeenCalled();
  });

  it('restarts when the toast updates in place', async () => {
    const { animate, created, highlights } = fakeAnimations();
    host({ timer: ToastTimer.Bar, defaultDuration: 1000 });
    const id = toastHost.toast({ title: 'Saving', key: 'save' });
    await settle();
    toastHost.update(id, { title: 'Saved' });
    await settle();
    expect(animate.mock.calls.filter(([frames]) => frames[0]?.transform === 'scaleX(1)')).toHaveLength(2);
    expect(highlights()).toBe(1);
    expect(created[0]!.cancel).toHaveBeenCalled();
  });
});

describe('toast durations', () => {
  it.each<{ name: string; props: Record<string, unknown>; toast: Partial<ToastOptions>; lifetime: number }>([
    {
      name: 'keeps errors on screen longer than the default',
      props: {},
      toast: { severity: 'danger' },
      lifetime: 8000,
    },
    {
      name: 'reads a severity the table leaves out from the default',
      props: {},
      toast: { severity: 'success' },
      lifetime: 1000,
    },
    {
      name: 'replaces the table, so an error it leaves out falls back to the default',
      props: { durations: { info: 4000 } },
      toast: { severity: 'danger' },
      lifetime: 1000,
    },
    {
      name: 'reads a replacing table’s own entries',
      props: { durations: { info: 4000 } },
      toast: { severity: 'info' },
      lifetime: 4000,
    },
    {
      name: 'lets a toast’s own duration win over the table',
      props: {},
      toast: { severity: 'danger', duration: 500 },
      lifetime: 500,
    },
  ])('$name', async ({ props, toast, lifetime }) => {
    useFakeClock();
    host({ defaultDuration: 1000, ...props });
    const dismissed = vi.fn();
    toastHost.toast({ title: 'Timed', ...toast, onDismiss: dismissed });
    await settle();
    await vi.advanceTimersByTimeAsync(lifetime - 100);
    expect(dismissed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('uses priority lifetimes and preserves a displaced toast’s elapsed time', async () => {
    useFakeClock();
    host({
      max: 1,
      timer: ToastTimer.Seconds,
      priorityDurations: { [NoticePriority.Normal]: 3000, [NoticePriority.High]: 10000 },
    });
    const ordinary = vi.fn();
    toastHost.toast({ title: 'Ordinary', severity: 'danger', onDismiss: ordinary });
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    expect(timers('seconds')[0]?.textContent).toBe('2s');
    const id = toastHost.toast({ title: 'High priority', priority: NoticePriority.High });
    await settle();
    expect(stack().textContent).toContain('High priority');
    expect(timers('seconds')[0]?.textContent).toBe('10s');
    await vi.advanceTimersByTimeAsync(5000);
    expect(ordinary).not.toHaveBeenCalled();
    toastHost.dismiss(id);
    await settle();
    expect(card('Ordinary')?.querySelector('[data-toast-timer="seconds"]')?.textContent).toBe('2s');
    await vi.advanceTimersByTimeAsync(2100);
    expect(ordinary).toHaveBeenCalledOnce();
  });

  it('expires a hard deadline through hover and without an available slot', async () => {
    useFakeClock();
    host({ max: 1 });
    const visibleDeadline = vi.fn();
    const queuedDeadline = vi.fn();
    toastHost.toast({
      title: 'Urgent Undo',
      priority: NoticePriority.Urgent,
      expiresAtMs: Date.now() + 6000,
      onDismiss: visibleDeadline,
    });
    toastHost.toast({
      title: 'Other deadline',
      priority: NoticePriority.High,
      expiresAtMs: Date.now() + 3000,
      onDismiss: queuedDeadline,
    });
    await settle();
    hover(true);
    await vi.advanceTimersByTimeAsync(3100);
    expect(queuedDeadline).toHaveBeenCalledOnce();
    expect(visibleDeadline).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(visibleDeadline).toHaveBeenCalledOnce();
  });
});

describe('toast pins', () => {
  it('omits Pin for sticky, custom and explicitly time-limited toasts', async () => {
    host();
    toastHost.toast({ title: 'Timed' });
    toastHost.toast({ title: 'Sticky', duration: Infinity });
    toastHost.toast({ content: 'Custom content' });
    toastHost.toast({ title: 'Undo expires', canPin: false });
    await settle();
    const pins = stack().querySelectorAll('[aria-label="Pin notification"]');
    expect(pins).toHaveLength(1);
    expect(pins[0]?.closest('[data-toast-id]')?.textContent).toContain('Timed');
  });

  it('removes a pinned card’s timer and gives it the full configured duration on unpin', async () => {
    useFakeClock();
    host({ max: 2, timer: ToastTimer.Seconds, canPauseOnHover: false });
    const task = vi.fn();
    const refresh = vi.fn();
    const queued = vi.fn();
    toastHost.toast({ title: 'Running', canPin: true, duration: 7000, onDismiss: task });
    toastHost.toast({ title: 'Refreshed', duration: 2000, onDismiss: refresh });
    toastHost.toast({ title: 'Queued', duration: 2000, onDismiss: queued });
    await settle();
    const pin = pinButton()!;
    await vi.advanceTimersByTimeAsync(1500);
    expect(timers('seconds')[0]?.textContent).toBe('6s');
    pin.click();
    await settle();
    expect(pin.getAttribute('aria-pressed')).toBe('true');
    expect(timers('seconds')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(8000);
    expect(refresh).toHaveBeenCalledOnce();
    expect(queued).toHaveBeenCalledOnce();
    expect(task).not.toHaveBeenCalled();
    expect(timers('seconds')).toHaveLength(0);
    pin.click();
    await settle();
    expect(pin.getAttribute('aria-pressed')).toBe('false');
    expect(timers('seconds')[0]?.textContent).toBe('7s');
    await vi.advanceTimersByTimeAsync(6900);
    expect(task).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(task).toHaveBeenCalledOnce();
  });

  it('restarts a pinned card’s clock when the host stops offering Pin', async () => {
    useFakeClock();
    const wrapper = host({ canPauseOnHover: false });
    const dismissed = vi.fn();
    toastHost.toast({ title: 'Running', duration: 2000, onDismiss: dismissed });
    await settle();
    pinButton()!.click();
    await settle();
    await vi.advanceTimersByTimeAsync(5000);
    expect(dismissed).not.toHaveBeenCalled();
    await wrapper.setProps({ canPin: false });
    await settle();
    expect(pinButton()).toBeNull();
    await vi.advanceTimersByTimeAsync(2100);
    expect(dismissed).toHaveBeenCalledOnce();
  });
});

describe('toast focus hold', () => {
  it('pauses expiry for descendant focus and resumes only after focus leaves the stack', async () => {
    useFakeClock();
    host({ defaultDuration: 100 });
    const dismissed = vi.fn();
    toastHost.toast({ title: 'Saved', onDismiss: dismissed });
    await settle();
    const button = stack().querySelector('button')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    hover(false);
    await settle();
    await vi.advanceTimersByTimeAsync(200);
    expect(dismissed).not.toHaveBeenCalled();
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await settle();
    await vi.advanceTimersByTimeAsync(110);
    expect(dismissed).toHaveBeenCalledOnce();
  });
});
