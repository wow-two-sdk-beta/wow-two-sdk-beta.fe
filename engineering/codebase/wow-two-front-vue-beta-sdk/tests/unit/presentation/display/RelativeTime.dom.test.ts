import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { RelativeTime } from '@src/presentation/display';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const now = Date.UTC(2026, 9, 15, 12, 0, 0);

function render(props: Record<string, unknown>): VueWrapper {
  const wrapper = mount(RelativeTime, { props: props as never, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

describe('RelativeTime', () => {
  it('renders a machine-readable time with relative text', () => {
    const wrapper = render({ value: now - 3 * 86_400_000, now });
    const time = wrapper.get('time');
    expect(time.attributes('datetime')).toBe(new Date(now - 3 * 86_400_000).toISOString());
    expect(time.text()).toBe('3 days ago');
  });

  it('words near distances unless numbers are asked for', () => {
    expect(render({ value: now - 86_400_000, now }).text()).toBe('yesterday');
    expect(render({ value: now - 86_400_000, now, numeric: 'always' }).text()).toBe('1 day ago');
  });

  it('shows the absolute time in a tooltip on hover', async () => {
    vi.useFakeTimers();
    const wrapper = render({ value: now - 3_600_000, now });
    await wrapper.get('time').trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(800);
    await nextTick();
    const tooltip = document.querySelector('[role=tooltip]');
    expect(tooltip?.textContent).toContain('2026');
  });

  it('ticks while live and stops when unmounted', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const wrapper = render({ value: now - 50_000, isLive: true, hasTooltip: false });
    expect(wrapper.text()).toBe('50 seconds ago');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(wrapper.text()).toBe('55 seconds ago');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(wrapper.text()).toBe('1 minute ago');
    wrapper.unmount();
    wrappers.splice(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders an empty time for an unreadable value', () => {
    const time = render({ value: 'soon', now }).get('time');
    expect(time.text()).toBe('');
    expect(time.attributes('datetime')).toBeUndefined();
  });
});
