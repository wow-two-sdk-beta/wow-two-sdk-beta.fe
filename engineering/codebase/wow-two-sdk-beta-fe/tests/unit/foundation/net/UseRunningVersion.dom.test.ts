import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useRunningVersion, type RunningVersionHandle, type RunningVersionSource } from '@src/foundation/net';

const IntervalMs = 1_000;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});

afterEach(() => {
  vi.useRealTimers();
});

/** Mounts a host that follows `load` and returns the handle with the wrapper. */
function host(load: RunningVersionSource) {
  let handle!: RunningVersionHandle;
  const wrapper = mount(
    defineComponent({
      setup() {
        handle = useRunningVersion(load, { intervalMs: IntervalMs });
        return () => h('span');
      },
    }),
  );
  return { wrapper, handle };
}

describe('useRunningVersion', () => {
  it('reads once on mount', async () => {
    const load = vi.fn(() => '0.4.2');
    const { wrapper, handle } = host(load);
    expect(handle.version.value).toBeNull();
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);
    expect(handle.version.value).toBe('0.4.2');
    wrapper.unmount();
  });

  it('keeps the last version when a read rejects', async () => {
    const load = vi.fn<RunningVersionSource>().mockResolvedValueOnce('0.4.2').mockRejectedValue(new Error('offline'));
    const { wrapper, handle } = host(load);
    await vi.advanceTimersByTimeAsync(0);
    await handle.refresh();
    expect(load).toHaveBeenCalledTimes(2);
    expect(handle.version.value).toBe('0.4.2');
    wrapper.unmount();
  });

  it('keeps the last version when the answer is empty or null', async () => {
    const load = vi.fn<RunningVersionSource>().mockResolvedValueOnce('0.4.2');
    const { wrapper, handle } = host(load);
    await vi.advanceTimersByTimeAsync(0);
    for (const answer of ['', '   ', null, undefined]) {
      load.mockResolvedValueOnce(answer);
      await handle.refresh();
      expect(handle.version.value).toBe('0.4.2');
    }
    wrapper.unmount();
  });

  it('trims the answer', async () => {
    const { wrapper, handle } = host(() => '  0.4.3\n');
    await vi.advanceTimersByTimeAsync(0);
    expect(handle.version.value).toBe('0.4.3');
    wrapper.unmount();
  });

  it('reads again after the interval', async () => {
    const load = vi.fn<RunningVersionSource>().mockResolvedValueOnce('0.4.2').mockResolvedValue('0.4.3');
    const { wrapper, handle } = host(load);
    await vi.advanceTimersByTimeAsync(0);
    expect(handle.version.value).toBe('0.4.2');
    await vi.advanceTimersByTimeAsync(IntervalMs);
    expect(load).toHaveBeenCalledTimes(2);
    expect(handle.version.value).toBe('0.4.3');
    wrapper.unmount();
  });

  it('reads on demand through refresh', async () => {
    const load = vi.fn<RunningVersionSource>().mockResolvedValueOnce('0.4.2').mockResolvedValue('0.5.0');
    const { wrapper, handle } = host(load);
    await vi.advanceTimersByTimeAsync(0);
    await handle.refresh();
    expect(load).toHaveBeenCalledTimes(2);
    expect(handle.version.value).toBe('0.5.0');
    wrapper.unmount();
  });

  it('leaves no timers after unmount', async () => {
    const { wrapper } = host(() => '0.4.2');
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
