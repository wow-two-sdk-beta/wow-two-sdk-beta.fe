import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import ToastHost, { toastHost, ToastTimer } from '@src/presentation/feedback/toastHost/ToastHost.vue';

/*
 * The toast's own chrome: which countdown display a toast gets and where it sits, how long each severity
 * stays, the severity glyphs, and content that arrives after the first render. The bar's animation contract
 * is covered by `ToastHostProgress`; these cases assert placement and the clock of the seconds display.
 */

const wrappers: VueWrapper[] = [];

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  toastHost.dismissAll();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const settle = async () => {
  await nextTick();
  await nextTick();
};

const host = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(ToastHost, { props: { defaultDuration: 5000, ...props }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
};

const stack = () => document.querySelector('[aria-label="Notifications"]')!;
const bars = () => document.querySelectorAll('[data-toast-progress]');
const timers = (kind: string) => document.querySelectorAll(`[data-toast-timer="${kind}"]`);

describe('toast timer display', () => {
  it('draws a ring or counts seconds beside the close button, and a bar along the bottom', async () => {
    host({ timer: ToastTimer.Ring });
    toastHost.toast({ title: 'Ringed' });
    toastHost.toast({ title: 'Counted', timer: ToastTimer.Seconds });
    toastHost.toast({ title: 'Barred', timer: ToastTimer.Bar });
    toastHost.toast({ title: 'Plain', timer: ToastTimer.None });
    await settle();

    expect(timers('ring')).toHaveLength(1);
    expect(timers('seconds')).toHaveLength(1);
    expect(bars()).toHaveLength(1);
    const ring = timers('ring')[0]!;
    expect(ring.getAttribute('aria-hidden')).toBe('true');
    expect(ring.parentElement!.nextElementSibling?.getAttribute('aria-label')).toBe('Dismiss');
  });

  it('keeps the deprecated flags working under the new display', async () => {
    host({ showProgress: true });
    toastHost.toast({ title: 'Bar by default' });
    toastHost.toast({ title: 'Opted out', progress: false });
    await settle();
    expect(bars()).toHaveLength(1);
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
    vi.useFakeTimers();
    host({ timer: ToastTimer.Seconds, defaultDuration: 3000 });
    toastHost.toast({ title: 'Saved' });
    await settle();
    const seconds = () => timers('seconds')[0]?.textContent;

    expect(seconds()).toBe('3s');
    await vi.advanceTimersByTimeAsync(1100);
    expect(seconds()).toBe('2s');
    stack().dispatchEvent(new MouseEvent('mouseenter'));
    await settle();
    await vi.advanceTimersByTimeAsync(5000);
    expect(seconds()).toBe('2s');
    stack().dispatchEvent(new MouseEvent('mouseleave'));
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    expect(seconds()).toBe('1s');
  });
});

describe('toast durations', () => {
  it('keeps errors on screen longer than the default', async () => {
    vi.useFakeTimers();
    host({ defaultDuration: 1000 });
    const saved = vi.fn();
    const failed = vi.fn();
    toastHost.toast({ title: 'Saved', severity: 'success', onDismiss: saved });
    toastHost.toast({ title: 'Failed', severity: 'danger', onDismiss: failed });
    await settle();
    await vi.advanceTimersByTimeAsync(1100);
    expect(saved).toHaveBeenCalledOnce();
    expect(failed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(7000);
    expect(failed).toHaveBeenCalledOnce();
  });

  it('replaces the table, reading a severity it leaves out from the default duration', async () => {
    vi.useFakeTimers();
    host({ defaultDuration: 1000, durations: { info: 4000 } });
    const info = vi.fn();
    const failed = vi.fn();
    toastHost.toast({ title: 'Heads up', severity: 'info', onDismiss: info });
    toastHost.toast({ title: 'Failed', severity: 'danger', onDismiss: failed });
    await settle();
    await vi.advanceTimersByTimeAsync(1100);
    expect(failed).toHaveBeenCalledOnce();
    expect(info).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(info).toHaveBeenCalledOnce();
  });

  it('lets a toast’s own duration win over the table', async () => {
    vi.useFakeTimers();
    host();
    const failed = vi.fn();
    toastHost.toast({ title: 'Failed', severity: 'danger', duration: 500, onDismiss: failed });
    await settle();
    await vi.advanceTimersByTimeAsync(600);
    expect(failed).toHaveBeenCalledOnce();
  });
});

describe('toast severity glyphs', () => {
  const glyphs = () => [...document.querySelectorAll('[data-toast-icon]')];

  it('gives every intent its own glyph and leaves neutral bare', async () => {
    host();
    for (const severity of ['info', 'success', 'warning', 'danger', 'neutral'] as const) {
      toastHost.toast({ title: severity, severity });
    }
    await settle();
    const icons = glyphs();
    expect(icons).toHaveLength(4);
    const shapes = new Set(icons.map((icon) => icon.querySelector('svg')!.innerHTML));
    expect(shapes.size).toBe(4);
    expect(icons[3]!.querySelector('svg')!.getAttribute('class')).toContain('text-destructive-soft-foreground');
  });

  it('yields to a custom icon and switches off per toast', async () => {
    host();
    toastHost.toast({ title: 'Custom', severity: 'info', icon: '🚀' });
    toastHost.toast({ title: 'Bare', severity: 'info', showSeverityIcon: false });
    await settle();
    expect(glyphs().map((icon) => icon.textContent?.trim())).toEqual(['🚀']);
  });

  it('switches off for a whole host, which a toast can still override', async () => {
    host({ showSeverityIcon: false });
    toastHost.toast({ title: 'Host off', severity: 'warning' });
    toastHost.toast({ title: 'Toast on', severity: 'warning', showSeverityIcon: true });
    await settle();
    expect(glyphs()).toHaveLength(1);
  });
});

describe('toast updates', () => {
  it('renders a description and an action that arrive after the first render', async () => {
    host();
    const id = toastHost.toast({ title: 'Deploying' });
    await settle();
    toastHost.update(id, {
      title: 'Deploy failed',
      severity: 'danger',
      description: 'The health check timed out.',
      action: h('button', { type: 'button' }, 'Retry'),
    });
    await settle();
    const text = stack().textContent ?? '';
    expect(text).toContain('The health check timed out.');
    expect(text).toContain('Retry');
    expect(document.querySelectorAll('[data-toast-icon]')).toHaveLength(1);
  });
});
