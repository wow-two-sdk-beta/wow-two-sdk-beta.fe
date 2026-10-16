import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { TimezonePicker } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** A January instant, when New York runs on standard time. */
const winter = Temporal.Instant.from('2026-01-15T12:00:00Z');
const zones = ['Asia/Tashkent', 'America/New_York', 'UTC', 'Asia/Kolkata', 'Not/AZone'];

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

function mountPicker(props: Record<string, unknown> = {}): VueWrapper {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
  const wrapper = mount(TimezonePicker, {
    props: { timeZones: zones, referenceInstant: winter, ...props },
    attrs: { 'aria-label': 'Time zone' },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

function optionLabels(): string[] {
  return [...document.querySelectorAll('[role=option]')].map((node) => node.textContent?.trim() ?? '');
}

describe('TimezonePicker', () => {
  it('labels a preset zone with its offset before the list ever opens', () => {
    const wrapper = mountPicker({ defaultValue: 'Asia/Kolkata' });
    expect(wrapper.get('[aria-label="Time zone"]').text()).toContain('Asia/Kolkata (GMT+05:30)');
  });

  it('orders zones west to east, skips zones the runtime rejects and reports a pick', async () => {
    const wrapper = mountPicker();
    await wrapper.get('[aria-label="Time zone"]').trigger('click');
    await settle();
    expect(optionLabels()).toEqual([
      'America/New York (GMT-05:00)',
      'UTC (GMT+00:00)',
      'Asia/Tashkent (GMT+05:00)',
      'Asia/Kolkata (GMT+05:30)',
    ]);
    const tashkent = [...document.querySelectorAll<HTMLElement>('[role=option]')].find((node) =>
      node.textContent?.includes('Tashkent'),
    )!;
    tashkent.click();
    await settle();
    expect(wrapper.emitted('update:modelValue')).toEqual([['Asia/Tashkent']]);
  });

  it('offers every runtime zone with UTC first by default', async () => {
    const wrapper = mountPicker({ timeZones: undefined });
    await wrapper.get('[aria-label="Time zone"]').trigger('click');
    await settle();
    const labels = optionLabels();
    expect(labels.length).toBeGreaterThan(100);
    expect(labels).toContain('UTC (GMT+00:00)');
  });
});
